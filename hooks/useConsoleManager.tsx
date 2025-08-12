import { useEffect } from 'react';

// Set to false to disable debug logs and reduce terminal clutter
const DEBUG_LOGGING = false;

export const useConsoleManager = () => {
	useEffect(() => {
		// COMPLETELY DISABLE ALL CONSOLE OUTPUT TO PREVENT TERMINAL CLUTTER
		// Save original console methods
		const originalConsole = {
			log: console.log,
			info: console.info,
			warn: console.warn,
			error: console.error,
			debug: console.debug,
		};

		// Make original console available globally
		(global as any).originalConsole = originalConsole;

		// Replace all console methods with empty functions
		console.log = () => {};
		console.info = () => {};
		console.warn = () => {};
		console.debug = () => {};
		// Keep error for critical issues
		console.error = (...args: any[]) => {
			if (
				args[0] &&
				typeof args[0] === 'string' &&
				args[0].includes('CRITICAL:')
			) {
				originalConsole.error(...args);
			}
		};

		// Function to temporarily restore console for debugging if needed
		(global as any).enableConsole = () => {
			console.log = originalConsole.log;
			console.info = originalConsole.info;
			console.warn = originalConsole.warn;
			console.error = originalConsole.error;
			console.debug = originalConsole.debug;
			console.log('Console output has been restored');
		};

		// Function to disable console again
		(global as any).disableConsole = () => {
			console.log = () => {};
			console.info = () => {};
			console.warn = () => {};
			console.debug = () => {};
			console.error = (...args: any[]) => {
				if (
					args[0] &&
					typeof args[0] === 'string' &&
					args[0].includes('CRITICAL:')
				) {
					originalConsole.error(...args);
				}
			};
		};

		// TEMPORARILY RESTORE CONSOLE OUTPUT FOR TESTING
		(global as any).enableConsole();

		// Disable noisy logs in production
		// if (typeof __DEV__ !== 'undefined' && !__DEV__) {
		// 	// Override default console methods to reduce output in production
		// 	const originalConsoleLog = console.log;
		// 	const originalConsoleInfo = console.info;

		// 	// Preserve error and warn for debugging
		// 	console.log = (...args: any[]) => {
		// 		if (DEBUG_LOGGING) {
		// 			originalConsoleLog(...args);
		// 		}
		// 	};

		// 	console.info = (...args: any[]) => {
		// 		if (DEBUG_LOGGING) {
		// 			originalConsoleInfo(...args);
		// 		}
		// 	};
		// }
	}, []);

	// Helper to prevent excessive logging
	const debugLog = (...args: any[]) => {
		if (DEBUG_LOGGING) {
			console.log(...args);
		}
	};

	return {
		debugLog,
		DEBUG_LOGGING,
	};
};
