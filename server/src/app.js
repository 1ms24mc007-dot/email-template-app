import express from 'express'; import cors from 'cors'; import cookieParser from 'cookie-parser';
import { env } from './config/env.js'; import routes from './routes/index.js'; import { notFound, errorHandler } from './middleware/errors.js';
const app = express();
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' })); app.use(cookieParser());
app.use('/api', routes); app.use(notFound); app.use(errorHandler);
export default app;
