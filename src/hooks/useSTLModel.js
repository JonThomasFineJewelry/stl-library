import { useEffect, useState } from 'react';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';
import { getCached, setCached } from '../lib/geometryCache.js';

const EMPTY = { geometry: null, dimensions: null, triangleCount: null, loading: false, error: '' };

export function useSTLModel(relPath, enabled) {
  const [state, setState] = useState(EMPTY);

  useEffect(() => {
    if (!enabled || !relPath) return undefined;
    let cancelled = false;

    const cached = getCached(relPath);
    if (cached) {
      setState({ ...cached, loading: false, error: '' });
      return () => {
        cancelled = true;
      };
    }

    setState((s) => ({ ...s, loading: true, error: '' }));

    (async () => {
      try {
        const data = await window.api.readFile(relPath);
        if (cancelled) return;
        const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        const loader = new STLLoader();
        const geo = loader.parse(arrayBuffer);
        geo.computeBoundingBox();
        geo.computeVertexNormals();
        const box = geo.boundingBox;
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);
        geo.translate(-center.x, -center.y, -center.z);
        const triangleCount = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;

        if (cancelled) {
          geo.dispose();
          return;
        }
        const result = { geometry: geo, dimensions: [size.x, size.y, size.z], triangleCount };
        setCached(relPath, result);
        setState({ ...result, loading: false, error: '' });
      } catch (err) {
        if (!cancelled) setState({ ...EMPTY, error: err.message || String(err) });
      }
    })();

    // Geometry ownership belongs to the cache now (LRU-evicted there), not this
    // component, since the same relPath may be rendered by multiple consumers
    // (a grid card and the lightbox) at once.
    return () => {
      cancelled = true;
    };
  }, [relPath, enabled]);

  return state;
}
