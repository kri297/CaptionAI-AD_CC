import { useState, useEffect, useRef, useCallback } from 'react';

export function useVideoSync(captions) {
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [activeCC, setActiveCC]       = useState(null);
  const [activeAC, setActiveAC]       = useState(null);
  const [volume, setVolume]           = useState(1);
  const [speed, setSpeed]             = useState(1);

  const findActive = useCallback((t, type) => {
    const active = captions.filter(c => c.type === type && t >= c.start && t <= c.end);
    if (!active.length) return null;
    // Return the one with the shortest duration (most specific event)
    return active.sort((a, b) => (a.end - a.start) - (b.end - b.start))[0];
  }, [captions]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    let rafId;

    const updateTime = () => {
      const t = v.currentTime;
      setCurrentTime(t);
      setActiveCC(findActive(t, 'cc'));
      setActiveAC(findActive(t, 'ac'));
      
      if (!v.paused && !v.ended) {
        rafId = requestAnimationFrame(updateTime);
      }
    };

    const onPlay = () => {
      setIsPlaying(true);
      rafId = requestAnimationFrame(updateTime);
    };

    const onPause = () => {
      setIsPlaying(false);
      if (rafId) cancelAnimationFrame(rafId);
    };

    const onTimeUpdate = () => {
      if (v.paused) {
        updateTime();
      }
    };

    const onMeta    = () => setDuration(isFinite(v.duration) ? v.duration : 0);
    const onEnded   = () => {
      setIsPlaying(false);
      if (rafId) cancelAnimationFrame(rafId);
    };
    const onVolume  = () => setVolume(v.volume);

    v.addEventListener('play',            onPlay);
    v.addEventListener('pause',           onPause);
    v.addEventListener('timeupdate',      onTimeUpdate);
    v.addEventListener('loadedmetadata',  onMeta);
    v.addEventListener('durationchange',  onMeta);
    v.addEventListener('ended',           onEnded);
    v.addEventListener('volumechange',    onVolume);

    return () => {
      v.removeEventListener('play',            onPlay);
      v.removeEventListener('pause',           onPause);
      v.removeEventListener('timeupdate',      onTimeUpdate);
      v.removeEventListener('loadedmetadata',  onMeta);
      v.removeEventListener('durationchange',  onMeta);
      v.removeEventListener('ended',           onEnded);
      v.removeEventListener('volumechange',    onVolume);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [findActive]);

  const seekTo = useCallback((t) => {
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, t);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const setVideoVolume = useCallback((v) => {
    if (videoRef.current) videoRef.current.volume = Math.max(0, Math.min(1, v));
  }, []);

  const setVideoSpeed = useCallback((s) => {
    if (videoRef.current) { videoRef.current.playbackRate = s; setSpeed(s); }
  }, []);

  return { videoRef, currentTime, duration, isPlaying, activeCC, activeAC, volume, speed, seekTo, togglePlay, setVideoVolume, setVideoSpeed };
}
