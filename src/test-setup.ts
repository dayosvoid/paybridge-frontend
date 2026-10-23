import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'

// jsdom rendering can exceed one second on development laptops under load.
configure({ asyncUtilTimeout: 5000 })
