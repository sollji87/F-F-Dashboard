import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/data/snowflake/export
 * Snowflake 데이터를 CSV 파일로 저장
 */
export async function POST(request) {
  try {
    const { month } = await request.json();
    
    // Snowflake 연결 정보 확인
    const account = process.env.SNOWFLAKE_ACCOUNT;
    const user = process.env.SNOWFLAKE_USER;
    const password = process.env.SNOWFLAKE_PASSWORD;
    
    if (!account || !user || !password) {
      return NextResponse.json({
        success: false,
        error: 'Snowflake 연결 정보가 설정되지 않았습니다.',
      }, { status: 400 });
    }
    
    // Snowflake 동적 import
    const snowflake = await import('snowflake-sdk');
    
    const connection = snowflake.createConnection({
      account: account,
      username: user,
      password: password,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE,
      database: process.env.SNOWFLAKE_DATABASE,
      schema: process.env.SNOWFLAKE_SCHEMA,
    });
    
    // 연결
    await new Promise((resolve, reject) => {
      connection.connect((err, conn) => {
        if (err) reject(err);
        else resolve(conn);
      });
    });
    
    // 쿼리 1: 매출 데이터
    const salesQuery = `
      SELECT
        TO_CHAR(DATE_TRUNC('month', d.PST_DT), 'YYYYMM') AS YYYYMM,
        d.BRD_CD,
        b.BRD_NM,
        SUM(d.ACT_SALE_AMT) AS TOTAL_SALES
      FROM FNF.SAP_FNF.DW_COPA_D d
      LEFT JOIN FNF.SAP_FNF.MST_BRD b USING (BRD_CD)
      WHERE d.PST_DT BETWEEN '2024-01-01' AND '2025-12-31'
        AND d.CORP_CD = '1000'
        AND d.CHNL_CD <> '9'
        AND NULLIF(TRIM(d.CHNL_CD), '') IS NOT NULL
        AND d.PRDT_CD IS NOT NULL
        AND d.PRDT_CD != ''
        AND d.brd_cd NOT IN ('A','W','C')
      GROUP BY 1, 2, 3
      ORDER BY 1, 2
    `;

    // 쿼리 2: 비용 데이터
    const costQuery = `
      WITH base AS (
        SELECT
            pst_yyyymm AS YYYYMM,
            brd_cd AS BRD_CD,
            brd_nm AS BRD_NM,
            cctr_cd AS CCTR_CD,
            cctr_nm AS CCTR_NM,
            CASE WHEN UPPER(cctr_cd) LIKE 'Z%' THEN '매장' ELSE '부서' END AS CCTR_TYPE,
            CASE WHEN ctgr1 = '제간비' THEN '지급수수료' ELSE ctgr1 END AS CATEGORY_L1,
            CASE WHEN ctgr1 = '제간비' THEN '지급수수료_기타' ELSE ctgr2 END AS CATEGORY_L2,
            ctgr3 AS CATEGORY_L3,
            gl_cd AS GL_CD,
            gl_nm AS GL_NM,
            SUM(ttl_use_amt) AS COST_AMT
        FROM sap_fnf.dm_idcst_cctr_m
        WHERE pst_yyyymm BETWEEN '202401' AND '202512'
          AND corp_cd = '1000'
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
      )
      SELECT * FROM base
      ORDER BY YYYYMM, BRD_CD, CCTR_CD
    `;
    
    // 쿼리 3: 매장수 데이터
    const storeQuery = `
      SELECT
        PST_YYYYMM,
        BRD_CD,
        BRD_NM,
        CHNL_CD,
        CHNL_NM,
        COUNT(SHOP_CD) AS STORE_COUNT
      FROM SAP_FNF.DM_PL_SHOP_M
      WHERE PST_YYYYMM BETWEEN '202401' AND '202512'
        AND ACT_SALE_AMT <> 0
        AND BRD_CD NOT IN ('A','W')
        AND CHNL_CD NOT IN ('4','5','8','9','99')
        AND (
              SHOP_NM IS NULL
              OR (
                   SHOP_NM NOT ILIKE '%(상-위)%'
               AND RTRIM(SHOP_NM) NOT ILIKE '%M'
              )
            )
      GROUP BY
        PST_YYYYMM, BRD_CD, BRD_NM, CHNL_CD, CHNL_NM
      ORDER BY
        PST_YYYYMM, BRD_CD, BRD_NM, CHNL_CD, CHNL_NM
    `;
    
    // 매출 데이터 조회
    const salesResult = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: salesQuery,
        complete: (err, stmt, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      });
    });
    
    // 비용 데이터 조회
    const costResult = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: costQuery,
        complete: (err, stmt, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      });
    });
    
    // 매장수 데이터 조회
    const storeResult = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: storeQuery,
        complete: (err, stmt, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      });
    });
    
    // 연결 종료
    connection.destroy();
    
    // CSV 파일 저장 경로
    const publicDataPath = path.join(process.cwd(), 'public', 'data');
    
    // 1. 매출 데이터 CSV 저장
    const salesCsvHeader = 'YYYYMM,BRD_CD,BRD_NM,TOTAL_SALES\n';
    const salesCsvRows = salesResult.map(row => {
      // 숫자 값 정리 (쉼표, 공백, 따옴표 제거)
      const totalSales = typeof row.TOTAL_SALES === 'string' 
        ? parseFloat(row.TOTAL_SALES.replace(/[,\s"']/g, '')) || 0
        : (row.TOTAL_SALES || 0);
      return `${row.YYYYMM || ''},${row.BRD_CD || ''},${row.BRD_NM || ''},${totalSales}`;
    }).join('\n');
    const salesCsvContent = '\uFEFF' + salesCsvHeader + salesCsvRows; // UTF-8 BOM 추가
    
    const salesFilePath = path.join(publicDataPath, 'snowflake_sales.csv');
    fs.writeFileSync(salesFilePath, salesCsvContent, 'utf8');
    
    // 2. 비용 데이터 CSV 저장
    const costCsvHeader = 'YYYYMM,BRD_CD,BRD_NM,CCTR_CD,CCTR_NM,CCTR_TYPE,CATEGORY_L1,CATEGORY_L2,CATEGORY_L3,GL_CD,GL_NM,COST_AMT\n';
    const costCsvRows = costResult.map(row => {
      // 숫자 값 정리 (쉼표, 공백, 따옴표 제거)
      const costAmt = typeof row.COST_AMT === 'string' 
        ? parseFloat(row.COST_AMT.replace(/[,\s"']/g, '')) || 0
        : (row.COST_AMT || 0);
      return `${row.YYYYMM || ''},${row.BRD_CD || ''},${row.BRD_NM || ''},${row.CCTR_CD || ''},${row.CCTR_NM || ''},${row.CCTR_TYPE || ''},${row.CATEGORY_L1 || ''},${row.CATEGORY_L2 || ''},${row.CATEGORY_L3 || ''},${row.GL_CD || ''},${row.GL_NM || ''},${costAmt}`;
    }).join('\n');
    const costCsvContent = '\uFEFF' + costCsvHeader + costCsvRows; // UTF-8 BOM 추가
    
    const costFilePath = path.join(publicDataPath, 'snowflake_costs.csv');
    fs.writeFileSync(costFilePath, costCsvContent, 'utf8');
    
    // 3. 매장수 데이터 CSV 저장
    const storeCsvHeader = 'PST_YYYYMM,BRD_CD,BRD_NM,CHNL_CD,CHNL_NM,STORE_COUNT\n';
    const storeCsvRows = storeResult.map(row => {
      // 숫자 값 정리 (쉼표, 공백, 따옴표 제거)
      const storeCount = typeof row.STORE_COUNT === 'string' 
        ? parseInt(row.STORE_COUNT.replace(/[,\s"']/g, '')) || 0
        : (row.STORE_COUNT || 0);
      return `${row.PST_YYYYMM || ''},${row.BRD_CD || ''},${row.BRD_NM || ''},${row.CHNL_CD || ''},${row.CHNL_NM || ''},${storeCount}`;
    }).join('\n');
    const storeCsvContent = '\uFEFF' + storeCsvHeader + storeCsvRows; // UTF-8 BOM 추가
    
    const storeFilePath = path.join(publicDataPath, 'snowflake_stores.csv');
    fs.writeFileSync(storeFilePath, storeCsvContent, 'utf8');
    
    return NextResponse.json({
      success: true,
      message: 'Snowflake 데이터가 CSV 파일로 저장되었습니다.',
      files: {
        sales: 'public/data/snowflake_sales.csv',
        costs: 'public/data/snowflake_costs.csv',
        stores: 'public/data/snowflake_stores.csv',
      },
      record_count: {
        sales: salesResult.length,
        costs: costResult.length,
        stores: storeResult.length,
      },
    });
    
  } catch (error) {
    console.error('Snowflake Export Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      hint: 'Snowflake 연결 정보와 쿼리를 확인해주세요.',
    }, { status: 500 });
  }
}

