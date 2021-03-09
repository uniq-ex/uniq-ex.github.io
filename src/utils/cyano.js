import { client } from '@ont-dev/ontology-dapi'

export const cyanoRequest = (method = 'smartContract.invokeWasmRead', param) => {
  // console.log('timestamp: ', new Date())
  // console.log('parameters: ', param)
  let request = ''

  switch (method) {
    case 'smartContract.invokeWasmRead':
      request = client.api.smartContract.invokeWasmRead
      break
    case 'smartContract.invokeWasm':
      request = client.api.smartContract.invokeWasm
      break
    default:
      request = client.api.smartContract.invokeWasmRead
      break
  }

  return request(param)
}
