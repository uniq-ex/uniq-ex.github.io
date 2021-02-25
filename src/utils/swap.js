import BigNumber from 'bignumber.js'

const REST = 0.997

export const findAllPaths = (pairs, sourceId, targetId) => {
  let pathArr = []
  const findPath = (sourceId, targetId, pathNodes = []) => {
    pathNodes = [...pathNodes]
    pathNodes.push(sourceId)

    if (sourceId === targetId) {
      pathArr.push(pathNodes)
      return
    }

    let neighborNodes = []
    pairs.map((p) => {
      if (p.token1 === sourceId) {
        neighborNodes.push(p.token2)
      } else if (p.token2 === sourceId) {
        neighborNodes.push(p.token1)
      }
    })

    for (let id of neighborNodes) {
      if (!pathNodes.includes(id)) {
        findPath(id, targetId, pathNodes)
      }
    }
  }

  findPath(sourceId, targetId)

  pathArr.sort((p1, p2) => {
    return p1.length - p2.length
  })
  
  return pathArr
}

const getInputAmount = (output, pair, reverse = false) => {
  let amount
  if (reverse) {
    amount = new BigNumber(pair.reserve1).times(pair.reserve2).div(new BigNumber(pair.reserve1).minus(output)).minus(pair.reserve2).div(REST).integerValue(BigNumber.ROUND_CEIL).toString()
    // amount = (pair.reserve1 * pair.reserve2 / (pair.reserve1 - output) - pair.reserve2) / REST
  } else {
    amount = new BigNumber(pair.reserve1).times(pair.reserve2).div(new BigNumber(pair.reserve2).minus(output)).minus(pair.reserve1).div(REST).integerValue(BigNumber.ROUND_CEIL).toString()
    // amount = (pair.reserve1 * pair.reserve2 / (pair.reserve2 - output) - pair.reserve1) / REST
  }
  return amount
}

const getOutputAmount = (input, pair, reverse = false) => {
  let amount
  if (reverse) {
    amount = new BigNumber(pair.reserve1).minus(new BigNumber(pair.reserve1).times(pair.reserve2).div(new BigNumber(input).times(REST).plus(pair.reserve2))).integerValue(BigNumber.ROUND_FLOOR).toString()
    // amount = pair.reserve1 - pair.reserve1 * pair.reserve2 / (pair.reserve2 + REST * input)
  } else {
    amount = new BigNumber(pair.reserve2).minus(new BigNumber(pair.reserve1).times(pair.reserve2).div(new BigNumber(input).times(REST).plus(pair.reserve1))).integerValue(BigNumber.ROUND_FLOOR).toString()
    // amount = pair.reserve2 - pair.reserve1 * pair.reserve2 / (pair.reserve1 + REST * input)
  }
  return amount
}

const findNextOutput = (input, pairs, token1, token2) => {
  let pair = pairs.find((p) => p.token1 === token1 && p.token2 === token2)

  if (pair) {
    return getOutputAmount(input, pair)
  }

  pair = pairs.find((p) => p.token1 === token2 && p.token2 === token1)

  if (pair) {
    return getOutputAmount(input, pair, true)
  }
}

const findPrevInput = (output, pairs, token1, token2) => {
  let pair = pairs.find((p) => p.token1 === token1 && p.token2 === token2)

  if (pair) {
    return getInputAmount(output, pair)
  }

  pair = pairs.find((p) => p.token1 === token2 && p.token2 === token1)

  if (pair) {
    return getInputAmount(output, pair, true)
  }
}

export const bestSwap = (type = 'exactin', amount, pairs, token1, token2) => {
  const paths = findAllPaths(pairs, token1, token2)
  const originAmount = amount
  let maxOutput = 0
  let minInput = Infinity
  let path = []
  
  for (let i = 0; i < paths.length; i++) {
    amount = originAmount
    if (type === 'exactin') {
      for (let j = 0; j < paths[i].length - 1; j++) {
        amount = findNextOutput(amount, pairs, paths[i][j], paths[i][j + 1])
      }
  
      if (amount > maxOutput) {
        maxOutput = amount
        path = paths[i]
      }
    } else {
      for (let j = paths[i].length - 1; j > 0; j--) {
        amount = findPrevInput(amount, pairs, paths[i][j - 1], paths[i][j])
      }
  
      if (amount < minInput && amount > 0) {
        minInput = amount
        path = paths[i]
      }
    }
  }

  if (type === 'exactin') {
    return [maxOutput, path]
  } else if (type === 'exactout') {
    return [minInput, path]
  }
}
