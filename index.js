import deriveReducers from './helpers/derive-reducers.js'
import normalizeAlias from './helpers/normalize-alias.js'
import enhanceReducer from './helpers/enhance-reducer.js'
import guardAgainstCycles from './helpers/guard-against-cycles.js'
import guardAgainstUnresolved from './helpers/guard-against-unresolved.js'
import handleDispatch from './helpers/handle-dispatch.js'

import getType from './helpers/get-type.js'

export const composableReducer = (
  reducerObject,
  { actionKey = 'type' } = {}
) => {
  const reducers = new Map()

  const { functions, aliases, composed } = deriveReducers(reducerObject)

  for (const [name, reducer] of functions) {
    reducers.set(name, [reducer])
  }

  const unresolved = []

  for (let index = aliases.length - 1; index >= 0; index -= 1) {
    const [name, alias] = aliases[index]
    const [normalizedAlias, aliasArguments] = normalizeAlias(alias)

    if (reducers.has(normalizedAlias)) {
      const reducer = reducers.get(normalizedAlias)

      reducers.set(
        name,
        aliasArguments ? enhanceReducer(reducer, aliasArguments) : reducer
      )

      aliases.splice(index, 1)

      index = aliases.length
    }
  }

  unresolved.push(...aliases)

  for (const [name, reducerParts] of composed) {
    const composedReducer = []

    for (const [index, reducer] of reducerParts.entries()) {
      const typeOfReducer = typeof reducer

      if (typeOfReducer === 'string') {
        const [normalizedAlias, aliasArguments] = normalizeAlias(reducer)

        if (reducers.has(normalizedAlias)) {
          const resolvedReducer = reducers.get(normalizedAlias)

          composedReducer.push(
            ...(aliasArguments
              ? enhanceReducer(resolvedReducer, aliasArguments)
              : resolvedReducer)
          )
        } else {
          composedReducer.push(reducer)

          unresolved.push([name, reducer])
        }
      } else if (typeOfReducer === 'function') {
        composedReducer.push(reducer)
      } else {
        throw new TypeError(
          `Supported reducer types for composed reducers are (function | string), "${name}[${index}]" is ${getType(
            reducer
          )}.`
        )
      }
    }

    reducers.set(name, composedReducer)
  }

  guardAgainstCycles(unresolved)

  for (let index = unresolved.length - 1; index >= 0; index -= 1) {
    const [name, alias] = unresolved[index]
    const [normalizedAlias, aliasArguments] = normalizeAlias(alias)

    if (reducers.has(normalizedAlias)) {
      if (reducers.has(name)) {
        const composedReducer = reducers.get(name)
        const aliasIndex = composedReducer.indexOf(alias)

        composedReducer.splice(
          aliasIndex,
          1,
          ...enhanceReducer(reducers.get(alias), aliasArguments)
        )

        reducers.set(name, composedReducer)
      } else {
        const reducer = reducers.get(normalizedAlias)

        reducers.set(
          name,
          aliasArguments ? enhanceReducer(reducer, aliasArguments) : reducer
        )
      }

      unresolved.splice(index, 1)

      index = unresolved.length
    }
  }

  guardAgainstUnresolved(unresolved)

  return handleDispatch(reducers, actionKey)
}

export default composableReducer
