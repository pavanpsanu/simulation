# PlantVista 3D

Frontend-only industrial monitoring demo built with React, TypeScript, Vite, Three.js (React Three Fiber/Drei), Tailwind and Zustand.

## Run

    npm install
    npm run dev

## Verify and build

    npm test
    npm run build
    npm run preview

The overview contains selectable 3D equipment, orbit controls and a shared telemetry simulation updating every two seconds. Pump power stops transfer; overheating locks the pump at 85°C until reset. The Data Flow page illustrates sensor → PLC → OPC UA gateway → MQTT → dashboard and displays matching JSON.

All telemetry, controller tags, connector states, contacts and controls are fictional browser-local examples. No PLC, broker, database or network data service is connected. WebGL is required for the 3D scene. Data resets on reload.
