// @ts-check

module.exports = {
  "#": (l) => l.__seq,
  level: (l) => l.level,
  timestamp: (l) => l.timestamp.substring(0, 20).replace("T", " "),
  message: (l) => l.message,
  bank: (l) => l.additionalInfo.bankName,
};
