import { hierarchy, linkVertical, select, tree, zoom } from 'd3';
import { useCallback, useEffect, useRef, useState } from 'react';

import { FamilyMember, familyMembersService } from '../services/api';

interface FamilyTreeProps {
  width?: number;
  height?: number;
  onMemberClick?: (member: FamilyMember) => void;
}

export function FamilyTree({ width = 800, height = 600, onMemberClick }: FamilyTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load family members data
  useEffect(() => {
    const loadFamilyData = async () => {
      try {
        setLoading(true);
        const members = await familyMembersService.getAll();
        setFamilyMembers(members);
        setError(null);
      } catch (err) {
        setError('Failed to load family data');
        console.error('Error loading family data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFamilyData();
  }, []);

  // Build family tree hierarchy
  const buildFamilyTree = useCallback((members: FamilyMember[]) => {
    if (members.length === 0) return null;

    // Find root members (those without parents)
    const rootMembers = members.filter(
      (member) => !member.parentIds || member.parentIds.length === 0,
    );

    if (rootMembers.length === 0) {
      // If no clear root, use the first member
      const firstMember = members[0];
      return hierarchy(firstMember, (d) => {
        return members.filter((m) => d.childrenIds && d.childrenIds.includes(m.id || ''));
      });
    }

    // Use the first root member as the tree root
    const rootMember = rootMembers[0];
    return hierarchy(rootMember, (d) => {
      return members.filter((m) => d.childrenIds && d.childrenIds.includes(m.id || ''));
    });
  }, []);

  // Create the family tree visualization
  useEffect(() => {
    if (!svgRef.current || familyMembers.length === 0 || loading) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous content

    const treeData = buildFamilyTree(familyMembers);
    if (!treeData) return;

    // Create tree layout
    const treeLayout = tree<FamilyMember>()
      .size([width - 200, height - 200])
      .nodeSize([100, 150]);

    const root = treeLayout(treeData);

    // Create zoom behavior
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);

    // Create main group
    const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Create links
    g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr(
        'd',
        (linkVertical() as any).x((d) => d.x).y((d) => d.y),
      )
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 2);

    // Create nodes
    const node = g
      .selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`);

    // Add circles for nodes
    node
      .append('circle')
      .attr('r', 40)
      .attr('fill', (d) => (d.data.spouseId ? '#ff6b6b' : '#4ecdc4'))
      .attr('stroke', '#333')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (onMemberClick) {
          onMemberClick(d.data);
        }
      });

    // Add member photos or initials
    node.each(function (d) {
      const nodeGroup = select(this);
      const member = d.data;

      if (member.photoUrl) {
        // Add photo
        nodeGroup
          .append('image')
          .attr('xlink:href', member.photoUrl)
          .attr('x', -30)
          .attr('y', -30)
          .attr('width', 60)
          .attr('height', 60)
          .attr('clip-path', 'circle()')
          .style('cursor', 'pointer')
          .on('click', () => {
            if (onMemberClick) {
              onMemberClick(member);
            }
          });
      } else {
        // Add initials
        const initials = member.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase();
        nodeGroup
          .append('text')
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .attr('font-size', '16px')
          .attr('font-weight', 'bold')
          .attr('fill', 'white')
          .style('pointer-events', 'none')
          .text(initials);
      }
    });

    // Add member names
    node
      .append('text')
      .attr('dy', '4em')
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .attr('fill', '#333')
      .style('pointer-events', 'none')
      .text((d) => d.data.name);

    // Add tooltips
    const tooltip = select('body')
      .append('div')
      .attr('class', 'family-tree-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    node
      .on('mouseover', function (event, d) {
        const member = d.data;
        tooltip.style('visibility', 'visible').html(`
            <div><strong>${member.name}</strong></div>
            <div>Relationship: ${member.relationship}</div>
            ${member.birthDate ? `<div>Born: ${member.birthDate}</div>` : ''}
            ${member.description ? `<div>${member.description}</div>` : ''}
          `);
      })
      .on('mousemove', function (event) {
        tooltip.style('top', event.pageY - 10 + 'px').style('left', event.pageX + 10 + 'px');
      })
      .on('mouseout', function () {
        tooltip.style('visibility', 'hidden');
      });

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove();
    };
  }, [familyMembers, loading, width, height, buildFamilyTree, onMemberClick]);

  if (loading) {
    return (
      <div
        className="family-tree-loading"
        style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div>Loading family tree...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="family-tree-error"
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'red',
        }}
      >
        <div>{error}</div>
      </div>
    );
  }

  if (familyMembers.length === 0) {
    return (
      <div
        className="family-tree-empty"
        style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div>No family members found</div>
      </div>
    );
  }

  return (
    <div className="family-tree-container" style={{ width, height }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ border: '1px solid #ccc', borderRadius: '4px' }}
        aria-label="Interactive family tree visualization"
      />
      <div
        className="family-tree-controls"
        style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}
      >
        <div>Zoom: Mouse wheel | Pan: Click and drag | Click nodes for details</div>
      </div>
    </div>
  );
}
