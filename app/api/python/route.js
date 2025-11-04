import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request) {
  try {
    const { script } = await request.json();
    
    if (!script) {
      return NextResponse.json(
        { success: false, error: '스크립트 이름이 필요합니다.' },
        { status: 400 }
      );
    }
    
    // 허용된 스크립트만 실행
    const allowedScripts = ['example', 'openai_example', 'snowflake_example'];
    if (!allowedScripts.includes(script)) {
      return NextResponse.json(
        { success: false, error: '허용되지 않은 스크립트입니다.' },
        { status: 400 }
      );
    }
    
    // Python 스크립트 경로
    const scriptPath = path.join(process.cwd(), 'python_scripts', `${script}.py`);
    const venvPython = path.join(process.cwd(), 'venv', 'Scripts', 'python.exe');
    
    // Python 스크립트 실행
    const { stdout, stderr } = await execAsync(`"${venvPython}" "${scriptPath}"`);
    
    if (stderr) {
      console.error('Python stderr:', stderr);
    }
    
    // Python 스크립트의 JSON 출력 파싱
    const result = JSON.parse(stdout);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Python API 엔드포인트',
    available_scripts: ['example', 'openai_example', 'snowflake_example'],
    usage: 'POST 요청으로 { "script": "example" } 형태로 호출하세요.'
  });
}

