"use client";

const DQN_SNIPPET = `import torch
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
        return self.fc3(x)`;

const LINEAR_REGRESSION_SNIPPET = `import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
import numpy as np

X = np.array([[1, 1], [1, 2], [2, 2], [2, 3], [3, 3], [3, 4]])
y = np.dot(X, np.array([1, 2])) + 3
X = pd.DataFrame(X, columns=["size", "num_bedrooms"])
y = pd.Series(y, name="price")

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = LinearRegression()
model.fit(X_train, y_train)
y_pred = model.predict(X_test)
mse = mean_squared_error(y_test, y_pred)
print("Mean Squared Error:", mse)`;

const KNN_SNIPPET = `from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score
from sklearn.datasets import load_iris

iris = load_iris()
X, y = iris.data, iris.target
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

knn = KNeighborsClassifier(n_neighbors=3)
knn.fit(X_train, y_train)
y_pred = knn.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print("Accuracy:", accuracy)`;

const Q_LEARNING_SNIPPET = `import numpy as np

n_states = 16
n_actions = 4
Q_table = np.zeros((n_states, n_actions))

learning_rate = 0.1
discount_factor = 0.9
epochs = 1000
exploration_prob = 0.1

for epoch in range(epochs):
    current_state = np.random.randint(0, n_states)
    while True:
        if np.random.rand() < exploration_prob:
            action = np.random.randint(0, n_actions)
        else:
            action = np.argmax(Q_table[current_state])

        next_state = (current_state + 1) % n_states
        reward = 1 if next_state == 15 else 0

        Q_table[current_state, action] += learning_rate * (
            reward + discount_factor * np.max(Q_table[next_state]) - Q_table[current_state, action]
        )

        current_state = next_state
        if current_state == 15:
            break

print("Learned Q-table (first 5 states):")
print(Q_table[:5])`;

export default function LunarLearningPanel({ compact = false }: { compact?: boolean }) {
  return (
    <section className="rounded-xl border border-cyan-300/25 bg-slate-900/50 p-3 text-xs text-slate-200">
      <p className="font-semibold uppercase tracking-[0.12em] text-cyan-200">Lunar Lander RL Guide</p>
      <p className="mt-2 text-slate-300">
        Reinforcement Learning (RL) is the standard for complex Lunar Lander agents. A Deep Q-Network (DQN) learns which action to take
        (left, right, main thrust) from lander state values.
      </p>
      <p className="mt-2 text-slate-300">
        Core pieces: Experience Replay, Target Network, Epsilon-Greedy exploration, and reward optimization.
      </p>
      <p className="mt-2 text-slate-300">Typical solve target: average score 200+ over 100 consecutive episodes.</p>
      {!compact ? (
        <div className="mt-2 space-y-2">
          <div>
            <p className="mb-1 font-semibold text-cyan-100">DQN (PyTorch)</p>
            <pre className="max-h-44 overflow-auto rounded-lg border border-slate-600/45 bg-slate-950/70 p-2 text-[11px] text-cyan-100">
              {DQN_SNIPPET}
            </pre>
          </div>
          <div>
            <p className="mb-1 font-semibold text-cyan-100">Linear Regression (Sklearn)</p>
            <pre className="max-h-44 overflow-auto rounded-lg border border-slate-600/45 bg-slate-950/70 p-2 text-[11px] text-cyan-100">
              {LINEAR_REGRESSION_SNIPPET}
            </pre>
          </div>
          <div>
            <p className="mb-1 font-semibold text-cyan-100">KNN Classifier (Sklearn)</p>
            <pre className="max-h-44 overflow-auto rounded-lg border border-slate-600/45 bg-slate-950/70 p-2 text-[11px] text-cyan-100">
              {KNN_SNIPPET}
            </pre>
          </div>
          <div>
            <p className="mb-1 font-semibold text-cyan-100">Q-Learning (Tabular)</p>
            <pre className="max-h-44 overflow-auto rounded-lg border border-slate-600/45 bg-slate-950/70 p-2 text-[11px] text-cyan-100">
              {Q_LEARNING_SNIPPET}
            </pre>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-slate-400">
          Included here: DQN (Lunar Lander), Linear Regression, KNN, and Q-Learning snippets for quick reference.
        </p>
      )}
      <p className="mt-2 text-slate-400">Run full training in Python environments (Colab/Kaggle/local), not in-browser gameplay loops.</p>
    </section>
  );
}
