import { select } from 'd3';
import React from 'react';

interface FamilyTreeControlsProps {
  svgRef: React.RefObject<SVGSVGElement>;
  width: number;
  height: number;
}

export function FamilyTreeControls({ svgRef, width, height }: FamilyTreeControlsProps) {
  const handleZoomIn = () => {
    const svg = svgRef.current;
    if (svg) {
      const g = select(svg).select<SVGGElement>('g');
      if (g) {
        const currentTransform = g.attr('transform') || '';
        g.attr('transform', currentTransform + ' scale(1.2)');
      }
    }
  };

  const handleZoomOut = () => {
    const svg = svgRef.current;
    if (svg) {
      const g = select(svg).select<SVGGElement>('g');
      if (g) {
        const currentTransform = g.attr('transform') || '';
        g.attr('transform', currentTransform + ' scale(0.8)');
      }
    }
  };

  const handleResetView = () => {
    const svg = svgRef.current;
    if (svg) {
      const g = select(svg).select<SVGGElement>('g');
      if (g) {
        g.attr('transform', `translate(${width / 2}, ${height / 2})`);
      }
    }
  };

  return (
    <div
      className="family-tree-controls"
      style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}
    >
      <div>Zoom: Mouse wheel | Pan: Click and drag | Click nodes for details</div>
      <div style={{ marginTop: '8px' }}>
        <button
          type="button"
          onClick={handleZoomIn}
          data-testid="zoom-in"
          style={{ marginRight: '8px' }}
        >
          Zoom In
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          data-testid="zoom-out"
          style={{ marginRight: '8px' }}
        >
          Zoom Out
        </button>
        <button type="button" onClick={handleResetView} data-testid="reset-view">
          Reset View
        </button>
      </div>
    </div>
  );
}
