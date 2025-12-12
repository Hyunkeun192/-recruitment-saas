import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Image as ImageIcon, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface QuestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultType: 'APTITUDE' | 'PERSONALITY';
}

interface OptionItem {
    text: string;
    imageUrl: string | null;
}

export default function QuestionModal({ isOpen, onClose, onSuccess, defaultType }: QuestionModalProps) {
    const [formData, setFormData] = useState({
        category: '',
        difficulty: 'MEDIUM',
        question: '',
        description: '',
        options: Array(5).fill({ text: '', imageUrl: null }) as OptionItem[],
        correctAnswer: '',
        score: 1,
        imageUrl: null as string | null
    });

    // Files state
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [optionImageFiles, setOptionImageFiles] = useState<{ [key: number]: File }>({});

    const [loading, setLoading] = useState(false);
    const [existingCategories, setExistingCategories] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            const fetchCategories = async () => {
                const { data } = await supabase.from('questions').select('category');
                if (data) {
                    const unique = Array.from(new Set(data.map(q => q.category).filter(Boolean)));
                    setExistingCategories(unique);
                }
            };
            fetchCategories();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleOptionTextChange = (idx: number, val: string) => {
        const newOptions = [...formData.options];
        newOptions[idx] = { ...newOptions[idx], text: val };
        setFormData({ ...formData, options: newOptions });
    };

    const handleOptionImageChange = (idx: number, file: File) => {
        // Store file to upload later
        setOptionImageFiles({ ...optionImageFiles, [idx]: file });

        // Show preview immediately using object URL
        const previewUrl = URL.createObjectURL(file);
        const newOptions = [...formData.options];
        newOptions[idx] = { ...newOptions[idx], imageUrl: previewUrl };
        setFormData({ ...formData, options: newOptions });
    };

    const removeOptionImage = (idx: number) => {
        const newFiles = { ...optionImageFiles };
        delete newFiles[idx];
        setOptionImageFiles(newFiles);

        const newOptions = [...formData.options];
        newOptions[idx] = { ...newOptions[idx], imageUrl: null };
        setFormData({ ...formData, options: newOptions });
    };

    const addOption = () => {
        if (formData.options.length >= 10) return;
        setFormData({ ...formData, options: [...formData.options, { text: '', imageUrl: null }] });
    };

    const removeOption = (idx: number) => {
        if (formData.options.length <= 2) return;
        const newOptions = formData.options.filter((_, i) => i !== idx);

        // Adjust files index map? It's complicated. 
        // Simpler to just reset files for safety or handle shift.
        // For now, let's just clear files if we delete an option to avoid mismatch (MVP).
        // A better way is to shift the keys in `optionImageFiles`.

        // Let's re-build optionImageFiles
        const newFiles: { [key: number]: File } = {};
        let newKey = 0;
        Object.keys(optionImageFiles).forEach(keyStr => {
            const k = parseInt(keyStr);
            if (k !== idx) {
                const targetKey = k > idx ? k - 1 : k;
                newFiles[targetKey] = optionImageFiles[k];
            }
        });
        setOptionImageFiles(newFiles);
        setFormData({ ...formData, options: newOptions });
    };

    const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!formData.question.trim()) throw new Error('문제 내용은 필수입니다.');

            let correctIndex: number | null = null;
            if (defaultType === 'APTITUDE') {
                if (!formData.correctAnswer) throw new Error('정답을 입력해주세요.');
                const ansNum = parseInt(formData.correctAnswer);
                if (isNaN(ansNum) || ansNum < 1 || ansNum > formData.options.length) {
                    throw new Error(`정답은 1에서 ${formData.options.length} 사이의 숫자여야 합니다.`);
                }
                correctIndex = ansNum - 1;
            }

            // 1. Upload Main Image
            let finalImageUrl = formData.imageUrl;
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `main_${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('questions')
                    .upload(fileName, imageFile);
                if (uploadError) throw uploadError;
                const { data } = supabase.storage.from('questions').getPublicUrl(fileName);
                finalImageUrl = data.publicUrl;
            }

            // 2. Upload Option Images
            const finalOptions = [...formData.options];
            for (const [idxStr, file] of Object.entries(optionImageFiles)) {
                const idx = parseInt(idxStr);
                const fileExt = file.name.split('.').pop();
                const fileName = `opt_${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('questions')
                    .upload(fileName, file);

                if (uploadError) {
                    console.error('Option upload failed', uploadError);
                    continue;
                }
                const { data } = supabase.storage.from('questions').getPublicUrl(fileName);
                finalOptions[idx] = { ...finalOptions[idx], imageUrl: data.publicUrl };
            }

            // Clean up previews (object URLs) if they weren't real files (though we only set preview on file selection)
            // If user didn't select file but kept preview... wait, our state only has preview if file selected.
            // But if we edit an existing question (future feature), we might have real URLs.
            // Here we assume new create mode.

            const { error } = await supabase.from('questions').insert({
                category: formData.category || '일반',
                difficulty: formData.difficulty,
                content: formData.question,
                description: formData.description,
                image_url: finalImageUrl,
                options: finalOptions, // Saves as JSONB array of objects
                correct_answer: correctIndex,
                score: formData.score,
                type: defaultType
            });

            if (error) throw error;

            toast.success('문제가 추가되었습니다.');
            onSuccess();

            // Reset
            setFormData({
                category: '',
                difficulty: 'Medium',
                question: '',
                description: '',
                options: Array(5).fill({ text: '', imageUrl: null }),
                correctAnswer: '',
                score: 1,
                imageUrl: null
            });
            setImageFile(null);
            setOptionImageFiles({});

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto text-black">
                <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold">
                        {defaultType === 'APTITUDE' ? '적성검사 문제 추가' : '인성검사 문제 추가'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-black">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-bold mb-2">영역 (Category)</label>
                        <input
                            list="categories"
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-black placeholder:text-gray-400"
                            placeholder="영역을 선택하거나 직접 입력하세요"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        />
                        <datalist id="categories">
                            {existingCategories.map((cat, i) => (
                                <option key={i} value={cat} />
                            ))}
                        </datalist>
                    </div>

                    {/* Difficulty and Score removed from UI, defaults used */}

                    <div>
                        <label className="block text-sm font-bold mb-2">문제 내용 <span className="text-red-500">*</span></label>
                        <textarea
                            className="w-full p-3 border rounded-lg h-24 focus:ring-2 focus:ring-blue-500 text-black"
                            placeholder="질문 내용을 입력하세요..."
                            value={formData.question}
                            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-2">문제 추가 설명 (이미지/텍스트)</label>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors">
                                    <ImageIcon size={16} />
                                    {imageFile ? '이미지 변경' : '이미지 업로드'}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleMainImageChange} />
                                </label>
                                {imageFile && <span className="text-sm text-blue-600 truncate">{imageFile.name}</span>}
                            </div>

                            {/* Main Image Preview */}
                            {imageFile && (
                                <div className="relative w-full h-40 bg-gray-50 rounded-lg overflow-hidden border">
                                    <img
                                        src={URL.createObjectURL(imageFile)}
                                        alt="Preview"
                                        className="w-full h-full object-contain"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setImageFile(null)}
                                        className="absolute top-2 right-2 bg-white/80 p-1 rounded-full text-red-500 hover:text-red-700"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            <textarea
                                className="w-full p-3 border rounded-lg h-20 focus:ring-2 focus:ring-blue-500 text-black"
                                placeholder="추가 설명이 필요하면 텍스트로 입력하거나 이미지를 업로드하세요."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Options with Images */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold">선택지 ({formData.options.length}개)</label>
                            <button
                                type="button"
                                onClick={addOption}
                                disabled={formData.options.length >= 10}
                                className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50"
                            >
                                + 선택지 추가
                            </button>
                        </div>
                        <div className="space-y-3">
                            {formData.options.map((opt, idx) => (
                                <div key={idx} className="flex flex-col gap-2 p-3 border rounded-lg bg-gray-50/50">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold w-6 text-center">{idx + 1}</span>
                                        <input
                                            className="flex-1 p-2 border rounded text-sm text-black"
                                            placeholder={`선택지 ${idx + 1}`}
                                            value={opt.text}
                                            onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                                            required={!opt.imageUrl} // Not required if image exists? Maybe both?
                                        />

                                        {/* Image Upload Button */}
                                        <div className="relative">
                                            <label className="cursor-pointer p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center justify-center">
                                                <ImageIcon size={18} />
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        if (e.target.files?.[0]) handleOptionImageChange(idx, e.target.files[0]);
                                                    }}
                                                />
                                            </label>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => removeOption(idx)}
                                            disabled={formData.options.length <= 2}
                                            className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded disabled:opacity-30"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    {/* Option Image Preview */}
                                    {opt.imageUrl && (
                                        <div className="ml-8 relative w-32 h-32 bg-white rounded border overflow-hidden group">
                                            <img
                                                src={opt.imageUrl}
                                                alt={`Option ${idx + 1}`}
                                                className="w-full h-full object-contain"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeOptionImage(idx)}
                                                className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {defaultType === 'APTITUDE' && (
                        <div>
                            <label className="block text-sm font-bold mb-2">정답 번호 <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                className="w-full p-2 border rounded-lg text-black"
                                placeholder="정답 번호를 입력하세요"
                                value={formData.correctAnswer}
                                onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                                min={1}
                                max={formData.options.length}
                                required
                            />
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50"
                        >
                            {loading ? '저장 중...' : '문제 저장'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
