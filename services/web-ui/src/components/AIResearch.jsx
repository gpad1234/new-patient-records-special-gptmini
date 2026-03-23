import React from 'react';
import config from '../config';
import './AIResearch.css';

export default function AIResearch() {
  const cls = config.SHOW_RESEARCH ? 'ai-research-container' : 'ai-research-disabled';
  return (
    <div className={cls} style={{padding: '1rem'}}>
      <h2>AI Research (disabled)</h2>
      <p>This feature is archived in the skinny pilot. Enable via <code>src/config.js</code> to restore.</p>
    </div>
  );
}
