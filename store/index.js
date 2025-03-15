import { createContext } from 'react'

const StoreContext = createContext({
  dealbreaker: {
    main: {
      flag: [],
      dealbreaker: []
    }
  },
  profile: ['main']
})

export default StoreContext
