Estamos realizando uma atualização na lógica de Session (Seção) e na organização dos datasets em CSV. Abaixo estão todas as mudanças que devem ser consideradas.

1️⃣ Atualização do Modelo Session
Novo formato da Session
{
  "id": 0,
  "user_id": "uuid",
  "dataset_id": 0,
  "started_at": "datetime",
  "finished_at": "datetime | null",
  "notes": "string | null",
  "vocal_health_note": "string | null",
  "termos": true,
  "status": "string",
  "numero_frase": 0
}
🔹 Novos Campos
✅ status

Representa o estado atual da sessão.

Valores possíveis:

"active" → quando a sessão é criada

"cancelada" → quando o usuário cancela

"finalizada" → quando o usuário conclui

✅ numero_frase

Representa o número da frase atual dentro do CSV do dataset que é o id da frase.

Esse campo será atualizado sempre que o usuário clicar em "Salvar e Próximo".

2️⃣ Nova Regra – Não usar mais cache para Session

❌ Não salvar mais dados da sessão em cache.

Agora toda verificação deve ser feita diretamente no banco.

3️⃣ Regra ao Criar Sessão
🚨 Se o usuário já tiver uma sessão ativa:

Ao tentar criar uma nova sessão, o backend deve:

Verificar se existe uma sessão com:

user_id = usuário

status = "active"

Se existir:

Retornar erro com status apropriado (ex: 400 ou 409) no seguinte formato:

{
  "detail": {
    "message": "An active session already exists for this user.",
    "session": {
      "id": 2,
      "user_id": "uuid",
      "dataset_id": 1,
      "started_at": "datetime",
      "finished_at": null,
      "notes": null,
      "vocal_health_note": null,
      "termos": true,
      "status": "active",
      "numero_frase": 1
    }
  }
}

⚠️ Importante: retornar TODOS os dados da sessão ativa existente.

4️⃣ Regra do Botão "Salvar e Próximo"

Ao clicar em Salvar e Próximo:

NÃO criar nova sessão

NÃO atualizar todos os campos

Atualizar apenas:

{
  "numero_frase": novo_numero
}

Ou seja:

Endpoint deve fazer update apenas do campo numero_frase

Não alterar started_at

Não alterar status

Não alterar outros campos

5️⃣ Nova Estrutura de Datasets

Agora teremos:

✅ Um CSV por dataset

Exemplos:

public/vozgeral_10m.csv
public/emocao_20m.csv
public/emocao_10m.csv
📄 Estrutura do CSV do Dataset

Formato:
    
id,text,blockId,videoSrc
0,"Voz geral 1",1,""
1,"Voz geral 2",1,""
2,"Voz geral 3",1,""
3,"Voz geral 4",2,""
4,"Voz geral 5",2,""
Campos:

id → identificador da frase

text → texto da frase

blockId → bloco ao qual a frase pertence

videoSrc → caminho do vídeo (pode ser vazio)

6️⃣ Estrutura de block.csv

Arquivo:

public/block.csv

Formato:

blockId,name,tipo,emocao,esponaniedade
0,"Bloco de Leitura",1,0,0
1,"Bloco de Respostas",1,0,1
2,"Bloco de Emocao feliz",1,2,0
3,"Bloco de Emocao triste",1,3,0
4,"Bloco de Emocao raiva",1,4,0
5,"Bloco de Emocao medo",1,5,0
6,"Bloco de Emocao surpresa",1,6,0
7,"Bloco de Emocao neutra",1,1,0
8,"Bloco de Emocao neutra video",1,1,1
9,"Bloco de Emocao feliz video",1,2,1
10,"Bloco de Emocao triste video",1,3,1
11,"Bloco de Emocao raiva video",1,4,1
12,"Bloco de Emocao medo video",1,5,1
13,"Bloco de Emocao surpresa video",1,6,1
🔹 Relação entre os arquivos

Cada frase do dataset possui um blockId

Esse blockId referencia o block.csv

O block.csv define:

Tipo do bloco

Emoção

Se é espontâneo (esponaniedade)

Se possui vídeo

7️⃣ Fluxo Correto da Aplicação

Usuário cria sessão
→ status = "active"
→ numero_frase = 0

Usuário grava frase
→ Ao clicar "Salvar e Próximo"
→ Atualizar apenas numero_frase

Usuário cancela
→ status = "cancelada"
→ finished_at preenchido

Usuário finaliza
→ status = "finalizada"
→ finished_at preenchido

8️⃣ Resumo das Mudanças Importantes

✅ Adicionado campo status
✅ Adicionado campo numero_frase
✅ Removido uso de cache para sessão
✅ Bloquear criação se já existir sessão ativa
✅ Atualizar apenas numero_frase no "Salvar e Próximo"
✅ Agora existe um CSV por dataset
✅ block.csv define estrutura dos blocos