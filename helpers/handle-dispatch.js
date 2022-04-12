import { findMatch } from 'ksdc'

const handleDispatch = (reducers, actionKey) => (state, action) => {
  if (reducers.has(action[actionKey]) === false) {
    const keys = [...reducers.keys()].sort()
    const similarKey = findMatch(keys, action[actionKey]).bestMatch.reference

    throw new TypeError(
      `Valid actions are ${keys.join(', ')}, but ${
        action[actionKey]
      } was used; did you mean to use ${similarKey} instead?`
    )
  }

  let newState = { ...state }

  for (const reducer of reducers.get(action[actionKey])) {
    newState = {
      ...newState,
      ...reducer(newState, action),
    }
  }

  return newState
}

export default handleDispatch
