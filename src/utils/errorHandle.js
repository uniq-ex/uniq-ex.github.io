export const handleError = (e, callback = () => {}) => {
  try {
    const json = JSON.parse(e)
    if (json.Result === 'wasm contract does not exist') {
      callback('CONTRACT_ADDRESS_ERROR')
    }
  } catch(error) {
    // TODO
  }
}