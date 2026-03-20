import re

with open('F:/Git/Criacao_datasets/dataset_speech/src/pages/RecordingPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

get_block_tutorial = '''const getBlockTutorial = (blockId: number, blocks: Block[]) => {
  const block = blocks.find(b => b.blockId === blockId);
  if (!block) return { title: `Bloco ${blockId}`, description: "Nova seção." };

  if (blockId === 1) return { title: block.name, description: "Bloco de ruído" };
  if (blockId === 2) return { title: block.name, description: "Nesta seção, leia as frases que aparecem na tela de forma clara e natural, como se estivesse conversando normalmente.", instruction: "Leia naturalmente" };
  if (blockId === 3) return { title: block.name, description: "Aqui você responderá perguntas de forma espontânea. Leia a pergunta na tela e responda naturalmente, como faria em uma conversa.", instruction: "Responda de forma espontânea e natural" };
  if (blockId === 104 || blockId === 105) return { title: block.name, description: "Leia ou responda focado em motivação.", instruction: "Motivação" };
  
  let emotionName = block.name.replace("Bloco de Emoção", "").replace("espontânea", "").trim();
  emotionName = emotionName.charAt(0).toUpperCase() + emotionName.slice(1);

  if (block.isSpontaneous) {
    return {
      title: block.name,
      description: `Assista ao vídeo e responda de forma espontânea, expressando a emoção que você sentiu ao vê-lo (${emotionName}).`,
      instruction: `Espontâneo: Responda com a emoção que sentiu ao ver o vídeo`
    };
  } else {
    return {
      title: block.name,
      description: `Leia as frases expressando ${emotionName}.`,
      instruction: `Expressar Emoção: ${emotionName}`
    };
  }
};'''

content = re.sub(
    r'const blockTutorials: \{ \[key: number\]: \{ title: string; description: string; instruction\?: string \} \} = \{[\s\S]*?\n\};\n',
    get_block_tutorial + '\n',
    content
)

fetch_replacement = '''const blockData: Block[] = lines.map(line => {
          const parts = line.split(',');
          const blockId = parseInt(parts[0]);
          const name = parts[1] ? parts[1].replace(/"/g, '') : '';
          const emocao = parts[2] ? parseInt(parts[2]) : 0;
          const isSpontaneous = parts[3] ? parts[3].trim() === '1' : false;
          return { blockId, name, emocao, isSpontaneous };
        });'''

content = re.sub(
    r'const blockData: Block\[\] = lines\.map\(line => \{[\s\S]*?return \{ blockId: parseInt\(blockId\), name: name\.replace\(/"/g, \'\'\) \};\n\s*\}\);',
    fetch_replacement,
    content
)

content = content.replace(
    'const tutorial = blockTutorials[nextBlockId] || { title: `Bloco ${nextBlockId}`, description: "Nova seção." };',
    'const tutorial = getBlockTutorial(nextBlockId, blocks);'
)

content = re.sub(
    r'\{blockTutorials\[currentPhrase\.blockId\]\?\.instruction && \(\s*<Typography variant=\"h6\" color=\"primary\" textAlign=\"center\" sx=\{\{ fontWeight: \'bold\', mb: 1 \}\}>\s*\{blockTutorials\[currentPhrase\.blockId\]\.instruction\}\s*</Typography>\s*\)\}',
    r'{getBlockTutorial(currentPhrase.blockId, blocks)?.instruction && (\n                      <Typography variant="h6" color="primary" textAlign="center" sx={{ fontWeight: \'bold\', mb: 1 }}>\n                        {getBlockTutorial(currentPhrase.blockId, blocks).instruction}\n                      </Typography>\n                    )}',
    content
)

with open('F:/Git/Criacao_datasets/dataset_speech/src/pages/RecordingPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
