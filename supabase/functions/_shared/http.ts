// Ortak HTTP hata sınıfı (ops ve paylaşılan modüller aynı sınıfı kullanır → instanceof doğru çalışır)
export class HttpError extends Error { constructor(public status: number, message: string, public code = 'ERROR') { super(message); } }
