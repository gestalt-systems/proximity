"use client"

import React, { useState, useCallback } from "react"

import { ProximityProvider, useProximity } from "./provider"
import { Visualization } from "./visualization"

function DatabaseLoadingIndicator() {
	const { isInitialized } = useProximity()
	if (isInitialized) return <div>Database is initialized!</div>
	return <div>Initializing database...</div>
}

export default function Page() {
	const [baseQuery, setBaseQuery] = useState<string | null>(null)

	const resetFilters = useCallback(() => {
		setBaseQuery(`SELECT * FROM foo"`)
	}, [])

	const filterSnow = useCallback(() => {
		setBaseQuery(`SELECT * FROM foo WHERE weather != "snow"`)
	}, [])

	const filterRain = useCallback(() => {
		setBaseQuery(`SELECT * FROM foo WHERE weather != "rain"`)
	}, [])

	return (
		<ProximityProvider baseQuery={baseQuery}>
			<DatabaseLoadingIndicator />
			<button onClick={resetFilters}>Reset filters</button>
			<button onClick={filterSnow}>Filter out Snow</button>
			<button onClick={filterRain}>Filter out Rain</button>
			<Visualization />
			<Visualization />
		</ProximityProvider>
	)
}
