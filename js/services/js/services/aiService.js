// js/services/aiService.js
import { db } from '../core/config.js';
import { collection, query, where, getDocs, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js";

const COLLECTION_AI_LOGS = 'aiLogs';

// Simile yon repons Chatbot
export async function askChatbot(companyId, question) {
    // Nan yon vre app, sa ta rele OpenAI API
    // Pou kounya, nou bay yon repons demo
    return new Promise((resolve) => {
        setTimeout(() => {
            const responses = [
                "Mwen analize done yo... Revni mwa sa a se 890k HTG.",
                "Dapre done yo, Stock Kafe a ap fini nan 7 jou.",
                "Kliyan ki pi aktif se SuperStore ak yon total 1.2M HTG.",
                "Mwen pa gen enfòmasyon sou sa. Eske ou ka presize?"
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            resolve(randomResponse);
        }, 800); // Simulation tan repons
    });
}

// Simile OCR: analiz yon dokiman
export async function processDocumentOCR(companyId, fileName) {
    // Nan yon vre app, sa ta rele API tankou Google Vision
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                fileName: fileName,
                status: 'Analize',
                extractedData: `Fakti #${Math.floor(Math.random() * 1000)} - Total: ${(Math.random() * 50000).toFixed(0)} HTG`
            });
        }, 1500);
    });
}

// Rekipere statistik aktivite IA
export async function getAIActivity(companyId) {
    const q = query(collection(db, COLLECTION_AI_LOGS), where('companyId', '==', companyId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
}

// Ajoute yon log IA
export async function logAIAction(companyId, actionType, details) {
    const data = { companyId, actionType, details, createdAt: Timestamp.now() };
    await addDoc(collection(db, COLLECTION_AI_LOGS), data);
}
