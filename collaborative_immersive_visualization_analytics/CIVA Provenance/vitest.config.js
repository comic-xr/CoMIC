import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.js'],
        include: ['src/**/*.test.{js,jsx,ts,tsx}'],
        exclude: ['src/utils/idGenerator.test.js', 'node_modules/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['src/ui/react/components/**/*.{js,jsx}'],
        },
    },
    resolve: {
        alias: {
            '@UI': path.resolve(__dirname, './src/ui'),
            '@Utils': path.resolve(__dirname, './src/utils'),
            '@Collaboration': path.resolve(__dirname, './src/collaboration'),
            '@Services': path.resolve(__dirname, './src/services'),
            '@Core': path.resolve(__dirname, './src/core'),
            '@Init': path.resolve(__dirname, './src/init'),
            '@VR': path.resolve(__dirname, './src/vr'),
            '@VTK': path.resolve(__dirname, './src/core/instances/types/vtk'),
        },
    },
});
