"use server";
import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { loadAssistantSource } from '@/lib/customer-assistant-source';
import { answerCatalogueQuestion, type AssistantReply } from '@/lib/customer-assistant-model';

const inputSchema=z.object({question:z.string().trim().min(1).max(500),locale:z.enum(['fr','ar']),currentSlug:z.string().max(200).optional(),context:z.object({terms:z.array(z.string().max(100)).max(16),ids:z.array(z.uuid()).max(5),maxPrice:z.number().finite().nonnegative().optional(),inclusive:z.boolean().optional()}).optional()});
export async function askStoreAssistant(input:unknown):Promise<AssistantReply>{
  const parsed=inputSchema.safeParse(input);
  if(!parsed.success)return {text:'Précisez votre question (500 caractères maximum).',links:[],context:{terms:[],ids:[]}};
  const {question,locale,context,currentSlug}=parsed.data;
  try{return answerCatalogueQuestion(question,await loadAssistantSource(locale),context,locale,currentSlug);}
  catch(error){unstable_rethrow(error);return {text:locale==='ar'?'الكتالوج غير متاح مؤقتاً. لا يمكنني تأكيد الأسعار أو المخزون الآن؛ حاول مجدداً أو تواصل مع GO ELEC.':'Le catalogue est temporairement indisponible. Je ne peux pas confirmer les prix ou le stock actuellement. Réessayez ou contactez GO ELEC.',links:[{label:'WhatsApp GO ELEC',href:'https://wa.me/212644535251'}],context:context??{terms:[],ids:[]}};}
}
