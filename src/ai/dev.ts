import { config } from 'dotenv';
config({ path: '.env.local' });

// Register all flows
import '@/ai/flows/suggest-payment-terms';