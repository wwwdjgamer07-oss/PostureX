"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { generateGameSuggestionPDF } from "@/lib/pdf/generateGameSuggestionPDF";

type GameModelSuggestionProps = {
  game: "snake" | "lander" | "pong" | "breakout" | "xo" | "memory" | "balance" | "slouch" | "reflex";
  compact?: boolean;
};

const SNIPPETS = {
  dqn: `import torch
import torch.nn as nn
import torch.nn.functional as F

class QNetwork(nn.Module):
    def __init__(self, state_size, action_size, seed):
        super(QNetwork, self).__init__()
        self.seed = torch.manual_seed(seed)
        self.fc1 = nn.Linear(state_size, 64)
        self.fc2 = nn.Linear(64, 64)
        self.fc3 = nn.Linear(64, action_size)

    def forward(self, state):
        x = F.relu(self.fc1(state))
        x = F.relu(self.fc2(x))
        return self.fc3(x)`,
  linear: `from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
import numpy as np
import pandas as pd

X = np.array([[1,1],[1,2],[2,2],[2,3],[3,3],[3,4]])
y = np.dot(X, np.array([1,2])) + 3
X = pd.DataFrame(X, columns=["size","num_bedrooms"])
y = pd.Series(y, name="price")

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = LinearRegression()
model.fit(X_train, y_train)
print(mean_squared_error(y_test, model.predict(X_test)))`,
  knn: `from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score
from sklearn.datasets import load_iris

iris = load_iris()
X, y = iris.data, iris.target
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

knn = KNeighborsClassifier(n_neighbors=3)
knn.fit(X_train, y_train)
print(accuracy_score(y_test, knn.predict(X_test)))`,
  qLearning: `import numpy as np

n_states, n_actions = 16, 4
Q_table = np.zeros((n_states, n_actions))
alpha, gamma, epsilon = 0.1, 0.9, 0.1

for _ in range(1000):
    s = np.random.randint(0, n_states)
    while True:
        a = np.random.randint(0, n_actions) if np.random.rand() < epsilon else np.argmax(Q_table[s])
        ns = (s + 1) % n_states
        r = 1 if ns == 15 else 0
        Q_table[s, a] += alpha * (r + gamma * np.max(Q_table[ns]) - Q_table[s, a])
        s = ns
        if s == 15:
            break`
} as const;

const BY_GAME = {
  snake: {
    label: "Q-Learning",
    why: "Snake is a sequential decision game with sparse rewards.",
    code: SNIPPETS.qLearning
  },
  lander: {
    label: "DQN",
    why: "Lander has continuous state and momentum-heavy control decisions.",
    code: SNIPPETS.dqn
  },
  pong: {
    label: "Q-Learning",
    why: "Pong can be framed as action-value control over paddle positions.",
    code: SNIPPETS.qLearning
  },
  breakout: {
    label: "Q-Learning",
    why: "Breakout uses repeated state-action updates with delayed rewards.",
    code: SNIPPETS.qLearning
  },
  xo: {
    label: "KNN",
    why: "KNN is a simple baseline for board-state pattern classification.",
    code: SNIPPETS.knn
  },
  memory: {
    label: "Linear Regression",
    why: "Linear regression is a lightweight baseline for score/time trend prediction.",
    code: SNIPPETS.linear
  },
  balance: {
    label: "Linear Regression",
    why: "Balance tracking can start with continuous posture score prediction.",
    code: SNIPPETS.linear
  },
  slouch: {
    label: "KNN",
    why: "Slouch detection can be framed as posture state classification.",
    code: SNIPPETS.knn
  },
  reflex: {
    label: "Q-Learning",
    why: "Reflex correction rewards fast action choices under changing states.",
    code: SNIPPETS.qLearning
  }
} as const;

export default function GameModelSuggestion({ game, compact = false }: GameModelSuggestionProps) {
  const suggestion = BY_GAME[game];
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      await generateGameSuggestionPDF({
        game,
        model: suggestion.label,
        why: suggestion.why,
        code: suggestion.code
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="rounded-lg border border-cyan-300/25 bg-slate-900/50 p-2 text-[11px] text-slate-200">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-cyan-100">Suggested Model: {suggestion.label}</p>
        <button
          type="button"
          onClick={() => {
            void handleGeneratePDF();
          }}
          disabled={isGenerating}
          className="inline-flex items-center gap-1 rounded border border-cyan-300/35 bg-cyan-400/10 px-2 py-1 text-[10px] text-cyan-100 disabled:opacity-60"
        >
          <Download className="h-3 w-3" />
          {isGenerating ? "Generating..." : "PDF"}
        </button>
      </div>
      <p className="mt-1 text-slate-300">{suggestion.why}</p>
      {!compact ? (
        <pre className="mt-2 max-h-40 overflow-auto rounded border border-slate-600/45 bg-slate-950/70 p-2 text-[10px] text-cyan-100">
          {suggestion.code}
        </pre>
      ) : (
        <details className="mt-1">
          <summary className="cursor-pointer text-cyan-200">Show snippet</summary>
          <pre className="mt-1 max-h-32 overflow-auto rounded border border-slate-600/45 bg-slate-950/70 p-2 text-[10px] text-cyan-100">
            {suggestion.code}
          </pre>
        </details>
      )}
    </section>
  );
}
