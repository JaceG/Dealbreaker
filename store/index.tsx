import { createContext } from 'react'

const StoreContext = createContext({
  dealbreaker: {
    main: {
      flag: [],
      dealbreaker: []
    }
  },
  profiles: [{ id: 'main', name: 'Main Profile' }],
  currentProfileId: 'main'
})

export default StoreContext
