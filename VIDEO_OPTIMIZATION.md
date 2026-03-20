# Guia de Otimização de Vídeos para a Web

Este documento explica como preparar vídeos (`.mp4`) para que eles carreguem de forma rápida e eficiente em aplicações web, utilizando a ferramenta de linha de comando **FFmpeg**.

A otimização de vídeos para a web baseia-se em dois pilares principais:
1. **Compressão**: Reduzir o tamanho do arquivo (MB) ajustando a resolução, taxa de bits e o codec utilizado.
2. **Fast Start (Web Optimization)**: Reorganizar os metadados do arquivo para que o navegador comece a reproduzi-lo imediatamente, sem precisar baixar o vídeo inteiro primeiro.

---

## Pré-requisitos

Você precisará do **FFmpeg** instalado na sua máquina.
- **Windows**: Baixe em [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) ou instale via Winget (`winget install ffmpeg`) ou Scoop (`scoop install ffmpeg`).
- **Linux (Ubuntu/Debian)**: `sudo apt install ffmpeg`
- **macOS**: `brew install ffmpeg`

---

## Passo a Passo

### 1. Comprimir e Redimensionar o Vídeo

O comando abaixo pega um vídeo original, limita a resolução máxima para 720p (mantendo a proporção), e utiliza o codec H.264 (padrão universal para web) com uma boa relação entre qualidade e tamanho.

```bash
ffmpeg -i video_original.mp4 -vf "scale='min(1280,iw)':-2" -vcodec libx264 -crf 28 -preset fast -acodec aac -b:a 128k video_comprimido.mp4
```

**O que cada parâmetro faz:**
- `-i video_original.mp4`: O arquivo de entrada.
- `-vf "scale='min(1280,iw)':-2"`: Filtro de vídeo. Limita a largura máxima a 1280 pixels (720p). Se o vídeo for menor que isso, ele mantém o tamanho original (`min(1280,iw)`). O `-2` garante que a altura seja proporcional e par (exigência do codec H.264).
- `-vcodec libx264`: Força o uso do codec de vídeo H.264, que tem 100% de compatibilidade com os navegadores.
- `-crf 28`: Constant Rate Factor (Qualidade). Varia de 0 (sem perdas) a 51 (pior qualidade). O valor `28` oferece uma excelente compressão para web com perda visual mínima. (O padrão é 23, aumentamos para diminuir o tamanho).
- `-preset fast`: Velocidade de compressão. `fast` comprime rápido com uma boa eficiência.
- `-acodec aac -b:a 128k`: Força o codec de áudio AAC com um bitrate de 128 kbps (excelente para voz e web).

### 2. Aplicar o Fast Start (Web Optimization)

Arquivos MP4 normais guardam suas informações essenciais (o `moov atom`, que contém a duração, índices de frames, etc.) no **final** do arquivo. Isso obriga o navegador a baixar tudo antes de dar o "play". O Fast Start move essa informação para o **início**.

```bash
ffmpeg -i video_comprimido.mp4 -c copy -movflags +faststart video_final.mp4
```

**O que cada parâmetro faz:**
- `-c copy`: Copia o vídeo e o áudio exatamente como estão, sem recodificar (o processo leva menos de 1 segundo).
- `-movflags +faststart`: Move o `moov atom` para o começo do arquivo.

---

## O Comando "Tudo em Um" (Recomendado)

Você pode realizar a compressão e a otimização de metadados de uma só vez usando um único comando:

```bash
ffmpeg -i video_original.mp4 -vf "scale='min(1280,iw)':-2" -vcodec libx264 -crf 28 -preset fast -acodec aac -b:a 128k -movflags +faststart video_pronto_para_web.mp4
```

### Processando Vários Vídeos de uma vez (PowerShell)

Se você estiver no Windows (PowerShell) e quiser otimizar vários arquivos de uma vez dentro de uma pasta:

```powershell
foreach ($file in Get-ChildItem -Filter *.mp4) {
    ffmpeg -y -i $file.Name -vf "scale='min(1280,iw)':-2" -vcodec libx264 -crf 28 -preset fast -acodec aac -b:a 128k -movflags +faststart "opt_$($file.Name)"
}
```
*Isso criará uma versão otimizada com o prefixo `opt_` para cada arquivo `.mp4` na pasta.*
