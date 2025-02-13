import { createContext } from 'react';

const StoreContext = createContext({
	dealbreaker: {
		main: {
			flag: [],
			dealbreaker: [],
		},
	},
	profile: [],
});

export default StoreContext;
