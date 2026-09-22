import { useState } from "react";

import "./App.css";
import { useEffect } from "react";

function App() {
	const [response, setResponse] = useState("loading...");

	useEffect(() => {
		fetch("/api/test")
			.then((res) => res.text())
			.then((data) => setResponse(data));
	}, []);

	return <div>Response: {response}</div>;
}

export default App;
