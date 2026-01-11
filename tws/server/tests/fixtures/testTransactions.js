// 测试交易数据
export const testTransactions = {
  validTransaction: {
    signature: 'mock-signature-123',
    from: '11111111111111111111111111111111',
    to: '22222222222222222222222222222222',
    amount: 1000000,
    timestamp: Date.now(),
    status: 'confirmed',
  },
  pendingTransaction: {
    signature: 'mock-signature-456',
    from: '11111111111111111111111111111111',
    to: '22222222222222222222222222222222',
    amount: 500000,
    timestamp: Date.now(),
    status: 'pending',
  },
};
