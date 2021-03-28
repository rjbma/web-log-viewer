type Tokens = string[]

interface Config {
  includeObjectKeys: boolean
}

const extractIndexTokens = (cfg: Config) => (obj: Object, tokens: Tokens = []): Tokens => {
  let newTokens = [...tokens]
  if (cfg.includeObjectKeys) {
    newTokens = [...newTokens, ...Object.keys(obj)]
  }
  return Object.values(obj).reduce((acc, val) => {
    if (!val) {
      return acc
    } else if (typeof val !== 'object') {
      return [...acc, removeDiacritics(val.toString())]
    } else {
      return extractIndexTokens(cfg)(val, acc)
    }
  }, newTokens)
}

// see: https://github.com/esamattis/underscore.string
const removeDiacritics = (str: string) => {
  const accents = 'ąàáäâãåæăćčĉęèéëêĝĥìíïîĵłľńňòóöőôõðøśșşšŝťțţŭùúüűûñÿýçżźž'
  const result = 'aaaaaaaaaccceeeeeghiiiijllnnoooooooossssstttuuuuuunyyczzz'

  return str.toLowerCase().replace(/.{1}/g, function (c: string) {
    var index = accents.indexOf(c)
    return index === -1 ? c : result[index]
  })
}

const isIndexMatch = (filter: string) => {
  if (!filter) {
    return () => true
  }
  const tokens = removeDiacritics(filter).split(/\s+/)
  return (index: Tokens) => tokens.every(token => index.find(isSingleMatch(token)))
}

const isSingleMatch = (tokenToSearch: string) => (data: string) => data.indexOf(tokenToSearch) != -1

export { extractIndexTokens, isIndexMatch }
