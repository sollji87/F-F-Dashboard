import { NextResponse } from 'next/server';

/**
 * POST /api/data/snowflake
 * Snowflake에서 실제 데이터 조회
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
        error: 'Snowflake 연결 정보가 설정되지 않았습니다. 환경 변수를 확인해주세요.',
        required_vars: ['SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USER', 'SNOWFLAKE_PASSWORD', 'SNOWFLAKE_WAREHOUSE', 'SNOWFLAKE_DATABASE', 'SNOWFLAKE_SCHEMA'],
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
      WHERE d.PST_DT BETWEEN '2024-01-01' AND '2025-09-30'
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
            ctgr1 AS CATEGORY_L1,
            ctgr2 AS CATEGORY_L2,
            ctgr3 AS CATEGORY_L3,
            gl_cd AS GL_CD,
            gl_nm AS GL_NM,
            SUM(ttl_use_amt) AS COST_AMT
        FROM sap_fnf.dm_idcst_cctr_m
        WHERE pst_yyyymm BETWEEN '202401' AND '202509'
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
    
    // 브랜드 코드 매핑 (Snowflake → 시스템)
    const brandCodeMap = {
      'M': 'MLB',
      'I': 'MLB_KIDS',  // I도 MLB_KIDS로 매핑
      'MK': 'MLB_KIDS', 
      'X': 'DISCOVERY',  // X도 DISCOVERY로 매핑
      'D': 'DISCOVERY',
      'V': 'DUVETICA',   // V도 DUVETICA로 매핑
      'DV': 'DUVETICA',
      'ST': 'SERGIO_TACCHINI',
    };
    
    // 데이터 가공
    const processedData = {
      sales: salesResult.map(row => ({
        month: row.YYYYMM?.replace('-', ''),
        brand_code: brandCodeMap[row.BRD_CD] || row.BRD_CD,
        brand_name: row.BRD_NM,
        total_sales: parseFloat(row.TOTAL_SALES) || 0,
      })),
      costs: costResult.map(row => ({
        month: row.YYYYMM,
        brand_code: brandCodeMap[row.BRD_CD] || row.BRD_CD,
        brand_name: row.BRD_NM,
        cctr_code: row.CCTR_CD,
        cctr_name: row.CCTR_NM,
        cctr_type: row.CCTR_TYPE,
        category_l1: row.CATEGORY_L1,
        category_l2: row.CATEGORY_L2,
        category_l3: row.CATEGORY_L3,
        gl_code: row.GL_CD,
        gl_name: row.GL_NM,
        cost_amt: parseFloat(row.COST_AMT) || 0,
      })),
      stores: storeResult.map(row => ({
        month: row.PST_YYYYMM,
        brand_code: brandCodeMap[row.BRD_CD] || row.BRD_CD,
        brand_name: row.BRD_NM,
        channel_code: row.CHNL_CD,
        channel_name: row.CHNL_NM,
        store_count: parseInt(row.STORE_COUNT) || 0,
      })),
    };
    
    return NextResponse.json({
      success: true,
      data: processedData,
      month,
      record_count: {
        sales: salesResult.length,
        costs: costResult.length,
        stores: storeResult.length,
      },
    });
    
  } catch (error) {
    console.error('Snowflake API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      hint: 'Snowflake 연결 정보와 쿼리를 확인해주세요.',
    }, { status: 500 });
  }
}

