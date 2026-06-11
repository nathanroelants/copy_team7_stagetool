import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import authRoutes from './routes/auth.js';
import docentRoutes from './routes/docent.routes.js';
import stagecommissieRoutes from './routes/stagecommissie.routes.js';
import stagevoorstellenRoutes from './routes/Studentstagevoorstellen-routes.js';

 
dotenv.config();
 
const app = express();

const PORT = process.env.PORT || 3000;
 
const supabase = createClient(

  process.env.SUPABASE_URL,

  process.env.SUPABASE_SERVICE_KEY

);
 
app.set('supabase', supabase);

app.use(cors());

app.use(express.json());
 
app.use('/api/auth', authRoutes);
app.use('/api/docent', docentRoutes);
app.use('/api/stagecommissie', stagecommissieRoutes)
app.use('/api/stagevoorstellen', stagevoorstellenRoutes);


app.get('/api/test', (req, res) => {

  res.json({ message: 'Backend werkt! 🚀' });

});
 
app.listen(PORT, () => {

  console.log(`🚀 Server draait op http://localhost:${PORT}`);

});
 