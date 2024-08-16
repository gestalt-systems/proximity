"use client"

import { useRef, useMemo, useState, useEffect } from "react"
import vegaEmbed, {
	EmbedOptions as VegaEmbedOptions,
	Result as VegaEmbedResult,
	VisualizationSpec as VegaEmbedVisualizationSpec,
} from "vega-embed"
import { useProximity } from "./provider"

export function Visualization() {
	const vizRef = useRef<HTMLDivElement>(null)

	const vlSpec = useMemo(() => {
		const spec: VegaEmbedVisualizationSpec = {} // TODO
		return spec
	}, [])

	const embedOptions = useMemo(() => {
		const opts: VegaEmbedOptions = {} // TODO
		return opts
	}, [])

	const query = "SELECT foo, bar FROM tempTable" // based on transforms extracted from vega-lite

	const [embedded, setEmbedded] = useState<VegaEmbedResult | null>(null)
	useEffect(() => {
		if (!vizRef.current) return
		vegaEmbed(vizRef.current, vlSpec, embedOptions).then(setEmbedded)
	}, [vlSpec, embedOptions])

	const { read } = useProximity()
	useEffect(() => {
		async function syncData() {
			if (!embedded) return
			const data = await read({ query })
			embedded.view.data("table", data.toRows())
		}
		syncData()
		return () => embedded?.finalize()
	}, [embedded, read])

	return <div ref={vizRef}></div>
}
