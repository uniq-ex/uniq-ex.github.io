import { useEffect, useCallback } from 'react'
import { client } from '@ont-dev/ontology-dapi'
import { utils } from 'ontology-ts-sdk'
import { SWAP_ADDRESS } from '../config'
import { handleError } from '../utils/errorHandle'
import { useMappedState, useDispatch } from 'redux-react-hook'

const { StringReader, reverseHex } = utils

export const useFetchPairs = () => {
  const { account, pairs } = useMappedState((state) => ({
    account: state.wallet.account,
    pairs: state.swap.pairs
  }))
  const dispatch = useDispatch()
  const setSwapTokens = useCallback((tokens) => dispatch({ type: 'SET_SWAP_TOKENS', tokens }), [])
  const setPairs = useCallback((pairs) => dispatch({ type: 'SET_PAIRS', pairs }), [])

  useEffect(() => {
    getSwapStat()
    let interval = setInterval(() => getSwapStat, 3000)
    return () => {
      interval && clearInterval(interval)
    }
  }, [account, pairs])

  function getSwapStat() {
    if (!pairs.length) {
      try {
        client.api.smartContract.invokeWasmRead({
          scriptHash: SWAP_ADDRESS,
          operation: 'stat',
          args: []
        })
        .then((pairStr) => {
          const parsedPairs = []
          const strReader = new StringReader(pairStr)
          const pairCount = strReader.readNextLen()
          for (let i = 0; i < pairCount; i++) {
            const pair = {}
            pair.address = reverseHex(strReader.read(20))
            pair.token1 = strReader.readUint128()
            pair.token2 = strReader.readUint128()
            pair.id = strReader.readUint128()
            pair.reserve1 = strReader.readUint128()
            pair.reserve2 = strReader.readUint128()

            parsedPairs.push(pair)
          }

          const tokenIds = []
          const tokenCount = strReader.readNextLen()
          for (let i = 0; i < tokenCount; i++) {
            tokenIds.push(strReader.readUint128())
          }

          setPairs(parsedPairs)
          setSwapTokens(tokenIds)
        })
        .catch((e) => {
          console.log(e)
        })
      } catch (e) {
        console.log(e)
      }
    }
  }

  return null
}