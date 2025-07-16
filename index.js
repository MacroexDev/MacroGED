import express from 'express';
import cron from 'node-cron';
import processarTasks from './tasks/taskExecutor.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('✅ Servidor de controle de arquivos ativo');
});

cron.schedule('*/1 * * * *', async () => {
  await processarTasks();
});

const PORT = process.env.PORT || 8130;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
