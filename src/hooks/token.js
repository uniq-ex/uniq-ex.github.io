import { useEffect, useCallback } from 'react'
import { client } from '@ont-dev/ontology-dapi'
import { utils } from 'ontology-ts-sdk'
import { CONTRACT_ADDRESS, STAKING_ADDRESS } from '../config'
import { handleError } from '../utils/errorHandle'
import { useMappedState, useDispatch } from 'redux-react-hook'

const { StringReader, hexstr2str, reverseHex } = utils

export const useFetchTokens = () => {
  const { stopInterval, tokens } = useMappedState((state) => ({
    stopInterval: state.common.stopInterval,
    tokens: state.common.tokens
  }))
  const dispatch = useDispatch()
  const setLoadingToken = useCallback((loadingToken) => dispatch({ type: 'SET_LOADING_TOKEN', loadingToken }), [])
  const setTokens = useCallback((tokens) => dispatch({ type: 'SET_TOKENS', tokens }), [])
  const setStopInterval = useCallback((stopInterval) => dispatch({ type: 'SET_STOP_INTERVAL', stopInterval }), [])

  useEffect(() => {
    getAllTokens()
    let interval = !stopInterval && setInterval(() => {
      if (tokens.length) {
        clearInterval(interval)
      } else {
        getAllTokens()
      }
    }, 5000)
    return () => {
      interval && clearInterval(interval)
    }
  }, [tokens, stopInterval])

  function getAllTokens() {
    if (!tokens.length) {
      try {
        client.api.smartContract.invokeWasmRead({
          scriptHash: CONTRACT_ADDRESS,
          operation: 'get_all_tokens',
          args: []
        })
        .then((tokenStr) => {
          setLoadingToken(false)
        
          const parsedTokens = []
          const strReader = new StringReader(tokenStr)
          const tokenCount = strReader.readNextLen()
          for (let i = 0; i < tokenCount; i++) {
            const token = {}
            const nameLength = strReader.readNextLen()
            token.name = hexstr2str(strReader.read(nameLength))
            token.address = reverseHex(strReader.read(20))
            token.ty = strReader.readUint8()
            token.decimals = strReader.readUint128()
            token.id = strReader.readUint128()

            parsedTokens.push(token)
          }

          const tokenMap = {}
          for (let i = 0; i < parsedTokens.length; i++) {
            tokenMap[parsedTokens[i].name] = parsedTokens[i]
          }

          const filteredTokens = Object.values(tokenMap).map((t) => {
            return {
              id: t.id,
              decimals: t.decimals,
              address: t.address,
              name: t.name,
              value: t.id,
              label: t.name
            }
          })

          setTokens(filteredTokens)
        })
        .catch((e) => {
          console.log(e)
          handleError(e, (errorCode) => {
            console.log(errorCode)
            if (errorCode === 'CONTRACT_ADDRESS_ERROR') {
              setStopInterval(true)
            } else {
              console.log('get all tokens', e)
            }
          })
        })
      } catch (e) {
        console.log(e)
      }
    }
  }

  return null
}

export const useFetchStakingTokens = (once = false) => {
  const { stopStakingInterval, stakingTokens } = useMappedState((state) => ({
    stopStakingInterval: state.common.stopStakingInterval,
    stakingTokens: state.common.stakingTokens
  }))
  const dispatch = useDispatch()
  const setLoadingStakingToken = useCallback((loadingStakingToken) => dispatch({ type: 'SET_LOADING_STAKING_TOKEN', loadingStakingToken }), [])
  const setStakingTokens = useCallback((stakingTokens) => dispatch({ type: 'SET_STAKING_TOKENS', stakingTokens }), [])
  const setStopStakingInterval = useCallback((stopStakingInterval) => dispatch({ type: 'SET_STOP_STAKING_INTERVAL', stopStakingInterval }), [])

  useEffect(() => {
    if (!once || !stakingTokens.length) {
      getStakingTokens()
      let interval = !stopStakingInterval && setInterval(getStakingTokens, 5000)

      return () => {
        interval && clearInterval(interval)
      }
    }
  }, [stopStakingInterval])

  useEffect(() => {
    if (!stopStakingInterval && stakingTokens.length && once) {
      setStopStakingInterval(true)
    }
  }, [stakingTokens])

  function getStakingTokens() {
    try {
      client.api.smartContract.invokeWasmRead({
        scriptHash: STAKING_ADDRESS,
        operation: 'get_all_tokens',
        args: []
      })
      .then((tokenStr) => {
        setLoadingStakingToken(false)
      
        const parsedTokens = []
        const strReader = new StringReader(tokenStr)
        const tokenCount = strReader.readNextLen()
        for (let i = 0; i < tokenCount; i++) {
          const token = {}
          const nameLength = strReader.readNextLen()
          token.name = hexstr2str(strReader.read(nameLength))
          token.address = strReader.read(20)
          token.weight = strReader.readUint128()
          token.ty = strReader.readUint8()
          token.decimals = strReader.readUint128()
          token.id = strReader.readUint128()
          token.balance = strReader.readUint128()

          parsedTokens.push(token)
        }

        const tokenMap = {}
        for (let i = 0; i < parsedTokens.length; i++) {
          tokenMap[parsedTokens[i].name] = parsedTokens[i]
        }

        const totalWeight = Object.values(tokenMap).filter((t) => t.balance).reduce((a, b) => a + b.weight, 0)
        const filteredTokens = Object.values(tokenMap).map((t) => {
          return {
            id: t.id,
            decimals: t.decimals,
            name: t.name,
            originWeight: t.weight,
            weight: t.balance ? (t.weight / totalWeight) : 0,
            balance: t.balance,
            value: t.id,
            label: t.name
          }
        })

        setStakingTokens(filteredTokens)
      })
      .catch((e) => {
        console.log(e)
        handleError(e, (errorCode) => {
          console.log(errorCode)
          if (errorCode === 'CONTRACT_ADDRESS_ERROR') {
            setStopStakingInterval(true)
          } else {
            console.log('get staking tokens', e)
          }
        })
      })
    } catch (e) {
      console.log(e)
    }
  }

  return null
}