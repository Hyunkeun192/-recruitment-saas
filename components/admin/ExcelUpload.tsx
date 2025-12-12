'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface QuestionRow {
    category: string;
    difficulty: string;
    question_text: string;
    option_a?: string;
    option_b?: string;
    option_c?: string;
    option_d?: string;
    correct_index?: number;
    type: string; // MULTIPLE_CHOICE | TEXT
    __rowNum__: number;
}

/**
 * 엑셀 업로드 컴포넌트
 * 
 * 엑셀 파일을 드래그앤드롭하여 대량의 문제를 파싱하고 서버로 전송합니다.
 * 파싱된 데이터의 미리보기 및 유효성 검사 결과를 보여줍니다.
 */
export default function ExcelUpload({ onSuccess, defaultType = 'APTITUDE' }: { onSuccess: () => void, defaultType?: 'APTITUDE' | 'PERSONALITY' }) {
    const [parsedData, setParsedData] = useState<QuestionRow[]>([]);
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const onDrop = async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            // row numbers needed for error reporting
            const jsonData: any[] = XLSX.utils.sheet_to_json(sheet);

            // Validate and Transform
            const validated: QuestionRow[] = [];
            const errs: string[] = [];

            jsonData.forEach((row, idx) => {
                const rowNum = idx + 2; // header is 1
                if (!row.question_text) {
                    errs.push(`Row ${rowNum}: 질문 내용(question_text)이 누락되었습니다.`);
                    return;
                }

                // For Aptitude, correct_index is required exists check (0 is falsy so check undefined)
                if (defaultType === 'APTITUDE' && row.correct_index === undefined) {
                    // Check if it's provided as a string "0" etc
                    if (row.correct_index === undefined) {
                        errs.push(`Row ${rowNum}: 정답(correct_index)이 누락되었습니다. (적성검사 필수)`);
                        return;
                    }
                }

                validated.push({
                    category: row.category || 'General',
                    difficulty: row.difficulty || 'Medium',
                    question_text: row.question_text,
                    option_a: row.option_a,
                    option_b: row.option_b,
                    option_c: row.option_c,
                    option_d: row.option_d,
                    correct_index: row.correct_index, // Can be undefined for Personality
                    type: defaultType, // Force type based on tab
                    __rowNum__: rowNum
                });
            });

            if (errs.length > 0) setErrors(errs);
            setParsedData(validated);

        } catch (e) {
            toast.error('파일 파싱 실패. 올바른 엑셀 파일인지 확인하세요.');
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
        maxFiles: 1
    });

    const handleUpload = async () => {
        if (parsedData.length === 0) return;
        setUploading(true);

        try {
            // Bulk Insert API Call
            const res = await fetch('/api/admin/questions/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questions: parsedData })
            });

            const result = await res.json();

            if (!res.ok) throw new Error(result.error);

            toast.success(`${result.count}개의 문제가 성공적으로 등록되었습니다!`);
            setParsedData([]);
            onSuccess();

        } catch (e: any) {
            toast.error('업로드 실패: ' + e.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600 mb-4">
                <p className="font-bold mb-2">업로드 주의사항 ({defaultType === 'APTITUDE' ? '적성검사' : '인성검사'})</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>파일 형식: .xlsx</li>
                    <li>필수 컬럼: question_text</li>
                    {defaultType === 'APTITUDE' && <li>필수 컬럼: correct_index (정답 번호, 0부터 시작)</li>}
                    <li>선택 컬럼: category, difficulty, option_a, option_b...</li>
                </ul>
            </div>

            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}`}
            >
                <input {...getInputProps()} />
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileSpreadsheet size={32} />
                </div>
                <p className="font-medium text-slate-700">엑셀 파일을 이곳에 드래그하거나 클릭하여 선택하세요.</p>
                <p className="text-sm text-slate-400 mt-2">현재 탭에 맞춰 <strong>{defaultType === 'APTITUDE' ? '적성검사' : '인성검사'}</strong>로 등록됩니다.</p>
            </div>

            {errors.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <h4 className="font-bold text-red-800 flex items-center gap-2 mb-2">
                        <AlertTriangle size={18} /> 파싱 오류 ({errors.length}건)
                    </h4>
                    <ul className="text-sm text-red-700 list-disc list-inside max-h-32 overflow-y-auto">
                        {errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </div>
            )}

            {parsedData.length > 0 && (
                <div className="bg-white rounded-xl border overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                        <span className="font-bold text-slate-700">미리보기 ({parsedData.length}개 항목)</span>
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
                        >
                            {uploading ? <Loader2 className="animate-spin" /> : <><Upload size={18} /> 데이터 업로드</>}
                        </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 sticky top-0">
                                <tr>
                                    <th className="p-3">#</th>
                                    <th className="p-3">카테고리</th>
                                    <th className="p-3">질문 미리보기</th>
                                    <th className="p-3">유형</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {parsedData.map((row, i) => (
                                    <tr key={i}>
                                        <td className="p-3 text-slate-400">{i + 1}</td>
                                        <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 rounded text-xs">{row.category}</span></td>
                                        <td className="p-3 truncate max-w-xs">{row.question_text}</td>
                                        <td className="p-3 text-xs text-slate-500">{row.type}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
