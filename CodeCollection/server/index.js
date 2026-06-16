import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import authRoutes from './routes/auth.js';
import docentRoutes from './routes/docent.routes.js';
import docentEvaluatieRoutes from './routes/docent.evaluatie.routes.js';
import stagecommissieRoutes from './routes/stagecommissie.routes.js';
import stagementorRoutes from './routes/stagementor.routes.js';
import stagementorEvaluatieRoutes from './routes/stagementor.evaluatie.routes.js';
dotenv.config();
import studentEvaluatieRoutes from './routes/student.evaluatie.routes.js';
import stagevoorstellenRoutes from './routes/Studentstagevoorstellen-routes.js';
import studentlogboekenRoutes from './routes/logboek.routes.js';
import adminRoutes from './routes/admin/admin-routes.js';
import competentiesRoutes from './routes/admin/competenties.js';



 
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
app.use('/api/docent', docentEvaluatieRoutes);
app.use('/api/stagecommissie', stagecommissieRoutes);
app.use('/api/stagementor', stagementorRoutes)
app.use('/api/stagementor', stagementorEvaluatieRoutes)
app.use('/api/student', studentEvaluatieRoutes);
app.use('/api/stagevoorstellen', stagevoorstellenRoutes);
app.use('/api/studentlogboeken', studentlogboekenRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', competentiesRoutes);


app.get('/api/test', (req, res) => {

  res.json({ message: 'Backend werkt! 🚀' });

});
 
app.listen(PORT, () => {

  console.log(`🚀 Server draait op http://localhost:${PORT}`);

});
 