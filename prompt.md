Estou implementando a funcionalidade final de 'Gravação de Som Ambiente' (Room Tone).

Atualmente, tenho um Modal que, ao clicar no botão, define o estado finalizationStep para 'roomTone'. Preciso que você crie ou ajuste o useEffect que monitora esse estado para realizar o ciclo completo de gravação e salvamento.

Requisitos da lógica:

Monitorar: Quando finalizationStep === 'roomTone', inicie a gravação (startRecording()) imediatamente.

Timer: Faça uma contagem regressiva de 5 segundos (atualizando o estado finalRoomToneCountdown para exibir na tela).

Parar e Salvar: Após os 5 segundos, chame stopRecording.

Callback do Blob: Preciso que a função stopRecording me devolva o blob de áudio gravado (ou que eu tenha acesso a ele) para que eu possa enviá-lo imediatamente.

Envio: Chame a função sendAudioData(blob, true, 1) (onde true indica is_room_tone e 1 é um ID de bloco padrão).

Próximo Passo: Após o envio (ou no final do timer), mude o estado para setFinalizationStep('notes').