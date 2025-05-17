// inside JudgeView component

useEffect(() => {
  if (!session.room) return;

  const interval = setInterval(async () => {
    const result = await clientKvGet(`room:${session.room}:lastWinner`);
    if (result) {
      try {
        const data = JSON.parse(result);
        if (winnerRef.current !== data.winner) {
          winnerRef.current = data.winner;
          setWinnerData(data);
          setShowWinner(true);

          if (!soundPlayedRef.current) {
            playSound('win');
            soundPlayedRef.current = true;
          }
        }
      } catch {
        // ignore parse errors
      }
    }
  }, 1000);

  return () => {
    clearInterval(interval);
  };
}, [session.room, playSound]);

// When closing winner modal, do NOT reset refs, only show scoreboard modal:
if (showWinner && winnerData) {
  return (
    <WinningReveal
      winner={winnerData.winner}
      curse={winnerData.curse}
      onClose={() => {
        setShowWinner(false);
        setWinnerData(null);
        setShowScoreboard(true); // Show scoreboard after winner modal
        // do NOT reset winnerRef or soundPlayedRef here
      }}
    />
  );
}

// When closing scoreboard modal (manual close), reset refs to allow new winner event detection:
if (showScoreboard) {
  return (
    <ScoreboardModal
      scores={roomData.scores}
      judge={roomData.judge}
      onClose={() => {
        setShowScoreboard(false);
        winnerRef.current = null;      // Reset winner tracking for next round
        soundPlayedRef.current = false; // Reset sound flag
      }}
    />
  );
}
