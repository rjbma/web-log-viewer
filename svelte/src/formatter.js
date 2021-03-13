// @ts-check

module.exports = {
  '#': (l, seq) => seq,
  level: l => l.level,
  timestamp: l => l.timestamp.substring(0, 19).replace('T', ' '),
  message: l => l.message,
  bank: l => l.additionalInfo.bankName,
  url: l => l.additionalInfo.url,
}
