import React, { useState } from 'react';
import Papa from 'papaparse';
import useGraphStore from '../store/graphStore';
import { parseGraphFromCsv } from '../utils/parseGraphFromCsv';

export default function CsvGraphUploader() {
  const setGraph = useGraphStore((state) => state.setGraph);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = parseGraphFromCsv(results.data);
        setGraph(parsed);
        console.log("Parsed Graph:", parsed);
      },
    });
  };

  return (
    <div style={{ margin: '20px' }}>
      <h2>📁 Upload Graph CSV File</h2>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
      {fileName && <p style={{ color: 'green' }}>Uploaded: {fileName}</p>}
    </div>
  );
}
