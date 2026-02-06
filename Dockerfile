# 1. Escolha uma versão leve do Node
FROM node:20-slim

# 2. Define o diretório de trabalho dentro do container
WORKDIR /app

# 3. Copia os arquivos de dependências primeiro (otimiza o cache do Docker)
COPY package*.json ./

# 4. Instala as dependências
RUN npm install --production

# 5. Copia o restante dos arquivos do seu projeto (incluindo o index.js)
COPY . .

# 6. Expõe a porta que seu app usa (ex: 3000)
EXPOSE 3000

# 7. Comando para rodar a aplicação
CMD ["node", "index.js"]