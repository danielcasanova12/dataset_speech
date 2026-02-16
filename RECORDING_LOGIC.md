# Análise Detalhada da Lógica de Gravação: `RecordingPage.tsx`

Este documento detalha o fluxo de controle, gerenciamento de estado e lógica de áudio do componente `RecordingPage.tsx`.

## 1. Visão Geral

O objetivo deste componente é permitir que um usuário grave uma série de frases de áudio. Ele gerencia o estado da sessão, a gravação de áudio, a visualização da forma de onda e o fluxo de navegação entre as frases.

## 2. Gerenciamento de Estado Principal

A lógica do componente é controlada por várias variáveis de estado do React:

-   **`session`**: Armazena os dados da sessão de gravação atual, obtidos da API.
-   **`currentPhraseIndex`**: Um número que rastreia qual frase da lista o usuário está gravando no momento.
-   **`preRecordingStep`**: Controla as etapas preliminares antes do início da gravação principal (por exemplo, `'voiceCheck'`, `'roomTone'`, `'recording'`).
-   **`isRecording`**: Um booleano que indica se o microfone está capturando áudio ativamente. É o principal gatilho para a visualização.
-   **`countdown`**: Um número que, quando não é nulo, exibe uma contagem regressiva na tela.
-   **`isProcessing`**: Um booleano para desabilitar botões e fornecer feedback visual (como um spinner) durante operações assíncronas (por exemplo, salvar uma frase).

### Refs para APIs do Navegador

-   **`streamRef`**: Mantém o objeto `MediaStream` do microfone do usuário.
-   **`mediaRecorderRef`**: Mantém a instância do `MediaRecorder`.
-   **`audioContextRef`**, **`analyserRef`**, **`sourceRef`**: Mantêm os nós da Web Audio API necessários para a visualização da forma de onda.
-   **`animationFrameId`**: Mantém o ID do `requestAnimationFrame` para que o loop de desenho da visualização possa ser cancelado.

## 3. Fluxo de Execução Passo a Passo

Este é o fluxo lógico desde o carregamento da página até a gravação de várias frases.

### Etapa 1: Carregamento e Iniciação da Sessão

1.  O componente é montado.
2.  Um `useEffect` principal é acionado para criar ou retomar uma sessão.
3.  **Se for uma nova sessão**: Ele faz uma chamada à API para criar uma nova sessão. Após o sucesso, ele define o estado `session` e ajusta `preRecordingStep` para `'voiceCheck'`.
4.  **Se for uma sessão retomada** (vindo da página inicial): Ele obtém os dados da sessão do estado da navegação, define o estado `session` e `currentPhraseIndex`, e define `preRecordingStep` como `'recording'` para pular as verificações de áudio.

### Etapa 2: Etapas de Pré-Gravação

1.  A interface do usuário renderiza os componentes para `'voiceCheck'`, `'voiceSample'`, e `'roomTone'` com base no estado `preRecordingStep`.
2.  Quando todas as etapas são concluídas, `preRecordingStep` é finalmente definido como `'recording'`.

### Etapa 3: O Loop de Gravação (Onde os Bugs Ocorriam)

Este é o fluxo corrigido para garantir que a forma de onda funcione sempre.

1.  **Início da Gravação**:
    *   Um `useEffect` monitora as alterações em `currentPhraseIndex` e `preRecordingStep`.
    *   Quando `preRecordingStep` é `'recording'` e o `currentPhraseIndex` é válido, a função `startRecording()` é chamada.
    *   `startRecording()` solicita acesso ao microfone, cria uma nova instância do `MediaRecorder` e define `isRecording` como `true`.

2.  **Início da Visualização**:
    *   Um `useEffect` separado monitora a variável de estado `isRecording`.
    *   Quando `isRecording` se torna `true`, este efeito chama a função `visualize()`.
    *   `visualize()` constrói o pipeline da Web Audio API: ele cria um `AudioContext`, um `AnalyserNode` e um `MediaStreamAudioSourceNode` a partir do `streamRef`. **É crucial que o `sourceRef` seja destruído e recriado a cada nova gravação para evitar que a onda congele.**
    *   Ele então inicia o loop de desenho com `requestAnimationFrame`.

3.  **Usuário Clica em "Salvar e Próxima"**:
    *   A função `processPhraseChange()` é chamada.
    *   **Ação Imediata**: `stopRecording()` é chamado. Isso interrompe o `MediaRecorder`, desconecta o `sourceRef` da Web Audio API e o anula (`sourceRef.current = null`), e cancela o `animationFrameId`. `isRecording` é definido como `false`.
    *   `isProcessing` é definido como `true` para bloquear a interface do usuário.
    *   O estado `countdown` é definido como `3`.

4.  **A Contagem Regressiva**:
    *   Um `useEffect` que monitora `countdown` é acionado.
    *   Ele espera 1 segundo e decrementa o valor.
    *   **Quando `countdown` chega a 0**:
        *   Ele chama a API para atualizar o `numero_frase` da sessão no backend.
        *   Após o sucesso, ele atualiza o estado local `currentPhraseIndex` para o novo índice.

5.  **O Ciclo se Repete**:
    *   Como `currentPhraseIndex` mudou, o `useEffect` da **Etapa 3.1** é acionado novamente, chamando `startRecording()` para a nova frase, o que, por sua vez, aciona o `useEffect` da **Etapa 3.2** para reiniciar a visualização.

## 4. Bugs Potenciais e Suas Soluções

1.  **BUG: A Forma de Onda Congela Após a Primeira Gravação**
    *   **Causa**: O `MediaStreamAudioSourceNode` (`sourceRef`) não estava sendo destruído e recriado corretamente. Uma vez que um `sourceRef` é desconectado, ele não pode ser simplesmente reconectado.
    *   **Solução**: A função `stopRecording` deve definir explicitamente `sourceRef.current = null`. A função `visualize` deve então verificar se `sourceRef.current` é nulo e, se for, criar uma nova instância e conectá-la ao analisador.

2.  **BUG: Gravação Ocorre Durante a Contagem Regressiva**
    *   **Causa**: Lógica de fluxo incorreta onde `startRecording` era chamado muito cedo, junto com o início da contagem regressiva.
    *   **Solução**: Desacoplar completamente a contagem regressiva do início da gravação. A contagem regressiva apenas leva à atualização do `currentPhraseIndex`. Um `useEffect` separado, que monitora `currentPhraseIndex`, é o único responsável por chamar `startRecording`. Isso garante que a gravação só comece *após* a pausa ter terminado e o novo estado ter sido renderizado.

3.  **BUG: "Variável usada antes da declaração"**
    *   **Causa**: Em JavaScript, `useCallback` e `useEffect` criam "closures". Se uma função `A` depende de uma função `B`, `B` deve ser declarada antes de `A` para que esteja disponível no escopo quando `A` for definida.
    *   **Solução**: Sempre defina as funções `useCallback` na ordem de sua dependência. Neste componente: `visualize` e `stopRecording` devem ser declarados antes de `startRecording`, que depende deles.
