import React from 'react';
import type { Character } from '../types';

interface Props {
  character: Character;
  onAnalysisChange: (characterId: string, updatedAnalysis: Character['structuredAnalysis']) => void;
}

const CharacterAnalysisEditor: React.FC<Props> = ({ character, onAnalysisChange }) => {
  if (!character.structuredAnalysis) {
    return <p className="text-sm text-gray-400">AI 분석 데이터가 없습니다. 이미지를 업로드하거나 재분석해주세요.</p>;
  }

  const handleChange = (path: string, value: string) => {
    const keys = path.split('.');
    const newAnalysis = JSON.parse(JSON.stringify(character.structuredAnalysis));
    let current = newAnalysis;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    onAnalysisChange(character.id, newAnalysis);
  };

  const renderInput = (label: string, path: string, value: string) => (
    <div key={path}>
      <label className="block text-xs font-medium text-gray-400">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => handleChange(path, e.target.value)}
        className="mt-1 w-full p-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
      />
    </div>
  );

  const analysis = character.structuredAnalysis;

  return (
    <div className="space-y-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
      <h4 className="text-md font-semibold text-indigo-300">캐릭터 속성 편집</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {renderInput('나이 (Age)', 'face.age', analysis.face?.age)}
        {renderInput('피부 톤 (Skin Tone)', 'face.skinTone', analysis.face?.skinTone)}
        {renderInput('얼굴형 (Face Shape)', 'face.shape', analysis.face?.shape)}
        {renderInput('눈 색 (Eye Color)', 'face.eyes.color', analysis.face?.eyes?.color)}
        {renderInput('눈 모양 (Eye Shape)', 'face.eyes.shape', analysis.face?.eyes?.shape)}
        {renderInput('머리 색 (Hair Color)', 'hair.color', analysis.hair?.color)}
        {renderInput('머리 길이 (Hair Length)', 'hair.length', analysis.hair?.length)}
        {renderInput('머리 스타일 (Hair Style)', 'hair.style', analysis.hair?.style)}
        {renderInput('체형 (Build)', 'body.build', analysis.body?.build)}
        {renderInput('의상 스타일 (Outfit Style)', 'outfit.style', analysis.outfit?.style)}
        {renderInput('핵심 의상 (Upper Body)', 'outfit.upperBody', analysis.outfit?.upperBody)}
        {renderInput('핵심 의상 (Lower Body)', 'outfit.lowerBody', analysis.outfit?.lowerBody)}
      </div>
    </div>
  );
};

export default CharacterAnalysisEditor;
