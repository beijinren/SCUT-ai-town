import { useMemo, useState } from 'react';
import { GameId } from '../../convex/aiTown/ids.ts';

type ProviderType = 'ollama' | 'openai' | 'together' | 'custom';

type ApiConnectionConfig = {
  provider: ProviderType;
  baseUrl: string;
  chatModel: string;
  embeddingModel: string;
  apiKey: string;
};

type ConnectionProfile = {
  name: string;
  config: ApiConnectionConfig;
  updatedAt: number;
};

type StoredState = {
  activeProfileName: string;
  profiles: ConnectionProfile[];
};

type TestState = {
  status: 'idle' | 'testing' | 'ok' | 'error';
  message: string;
};

type ModelFetchState = {
  status: 'idle' | 'loading' | 'ok' | 'error';
  message: string;
};

type MessageTestState = {
  status: 'idle' | 'sending' | 'ok' | 'error';
  message: string;
  response: string;
};

export type RoleLocatorEntry = {
  playerId: GameId<'players'>;
  name: string;
  character: string;
  position: { x: number; y: number };
  description: string;
  publicProfile?: string;
  facing: string;
  activity: string;
  social: string;
};

const STORAGE_KEY = 'aitown.connectionProfiles.v1';

const defaultConfig: ApiConnectionConfig = {
  provider: 'ollama',
  baseUrl: 'http://127.0.0.1:11434',
  chatModel: 'llama3',
  embeddingModel: 'mxbai-embed-large',
  apiKey: '',
};

function nowText(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

function readStoredState(): StoredState {
  const fallback: StoredState = {
    activeProfileName: 'Default (Local Ollama)',
    profiles: [
      {
        name: 'Default (Local Ollama)',
        config: defaultConfig,
        updatedAt: Date.now(),
      },
    ],
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw) as StoredState;
    if (!parsed.profiles || parsed.profiles.length === 0) {
      return fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function writeStoredState(state: StoredState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeBaseUrl(url: string) {
  return url.trim().replace(/\/$/, '');
}

function statusClass(status: TestState['status']) {
  switch (status) {
    case 'ok':
      return 'bg-green-700 text-green-50';
    case 'error':
      return 'bg-rose-700 text-rose-50';
    case 'testing':
      return 'bg-amber-700 text-amber-50';
    default:
      return 'bg-brown-600 text-brown-50';
  }
}

export function ApiConnectionPanel({
  roleLocatorEntries,
  onFocusPlayer,
}: {
  roleLocatorEntries: RoleLocatorEntry[];
  onFocusPlayer: (playerId: GameId<'players'>) => void;
}) {

  const stored = useMemo(() => readStoredState(), []);
  const [profiles, setProfiles] = useState<ConnectionProfile[]>(stored.profiles);
  const [activeProfileName, setActiveProfileName] = useState<string>(stored.activeProfileName);
  const [draftName, setDraftName] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [testState, setTestState] = useState<TestState>({ status: 'idle', message: '尚未测试连接。' });
  const [modelFetchState, setModelFetchState] = useState<ModelFetchState>({
    status: 'idle',
    message: '尚未拉取模型列表。',
  });
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [testPrompt, setTestPrompt] = useState('你好，请回复“连接正常”。');
  const [messageTestState, setMessageTestState] = useState<MessageTestState>({
    status: 'idle',
    message: '尚未发送测试消息。',
    response: '',
  });

  const activeProfile =
    profiles.find((profile) => profile.name === activeProfileName) ?? profiles[0] ?? null;

  const [workingConfig, setWorkingConfig] = useState<ApiConnectionConfig>(
    activeProfile?.config ?? defaultConfig,
  );

  const unsaved =
    !!activeProfile && JSON.stringify(activeProfile.config) !== JSON.stringify(workingConfig);

  function updateWorkingConfig(updater: (prev: ApiConnectionConfig) => ApiConnectionConfig) {
    setWorkingConfig((prev) => {
      const next = updater(prev);
      const normalized = {
        ...next,
        baseUrl: normalizeBaseUrl(next.baseUrl),
      };
      setProfiles((prevProfiles) => {
        const nextProfiles = prevProfiles.map((profile) =>
          profile.name === activeProfileName
            ? {
                ...profile,
                config: normalized,
                updatedAt: Date.now(),
              }
            : profile,
        );
        writeStoredState({
          profiles: nextProfiles,
          activeProfileName,
        });
        return nextProfiles;
      });
      return normalized;
    });
  }

  function persist(nextProfiles: ConnectionProfile[], nextActiveName: string) {
    const next: StoredState = {
      profiles: nextProfiles,
      activeProfileName: nextActiveName,
    };
    writeStoredState(next);
    setProfiles(nextProfiles);
    setActiveProfileName(nextActiveName);
  }

  function switchProfile(name: string) {
    const target = profiles.find((profile) => profile.name === name);
    if (!target) {
      return;
    }
    setActiveProfileName(name);
    setWorkingConfig(target.config);
    setTestState({ status: 'idle', message: '已切换配置档案，等待测试连接。' });
    writeStoredState({ profiles, activeProfileName: name });
  }

  function createProfile() {
    const name = draftName.trim();
    if (!name) {
      setTestState({ status: 'error', message: '请输入新的配置档案名称。' });
      return;
    }
    if (profiles.some((profile) => profile.name === name)) {
      setTestState({ status: 'error', message: '配置档案名称重复，请使用唯一名称。' });
      return;
    }
    const nextProfile: ConnectionProfile = {
      name,
      config: { ...workingConfig, baseUrl: normalizeBaseUrl(workingConfig.baseUrl) },
      updatedAt: Date.now(),
    };
    const nextProfiles = [...profiles, nextProfile];
    persist(nextProfiles, name);
    setDraftName('');
    setTestState({ status: 'ok', message: '已创建新的配置档案。' });
  }

  function updateCurrentProfile() {
    if (!activeProfile) {
      return;
    }
    const nextProfiles = profiles.map((profile) =>
      profile.name === activeProfile.name
        ? {
            ...profile,
            config: { ...workingConfig, baseUrl: normalizeBaseUrl(workingConfig.baseUrl) },
            updatedAt: Date.now(),
          }
        : profile,
    );
    persist(nextProfiles, activeProfile.name);
    setTestState({ status: 'ok', message: '已更新当前配置档案。' });
  }

  function reloadCurrentProfile() {
    if (!activeProfile) {
      return;
    }
    setWorkingConfig(activeProfile.config);
    setTestState({ status: 'idle', message: '已从档案重载当前配置。' });
  }

  function deleteCurrentProfile() {
    if (!activeProfile) {
      return;
    }
    if (profiles.length <= 1) {
      setTestState({ status: 'error', message: '至少保留一个配置档案。' });
      return;
    }
    const nextProfiles = profiles.filter((profile) => profile.name !== activeProfile.name);
    const nextActiveName = nextProfiles[0].name;
    persist(nextProfiles, nextActiveName);
    setWorkingConfig(nextProfiles[0].config);
    setTestState({ status: 'ok', message: '已删除当前配置档案。' });
  }

  async function testConnection() {
    const base = normalizeBaseUrl(workingConfig.baseUrl);
    if (!base) {
      setTestState({ status: 'error', message: 'Base URL 不能为空。' });
      return;
    }
    setTestState({ status: 'testing', message: '正在测试连接...' });

    try {
      if (workingConfig.provider === 'ollama') {
        const response = await fetch(`${base}/api/tags`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        setTestState({ status: 'ok', message: 'Ollama 连接成功。' });
        return;
      }

      const headers: Record<string, string> = {};
      if (workingConfig.apiKey.trim()) {
        headers.Authorization = `Bearer ${workingConfig.apiKey.trim()}`;
      }
      const response = await fetch(`${base}/v1/models`, { headers });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setTestState({ status: 'ok', message: '接口连接成功。' });
    } catch (error) {
      const detail = error instanceof Error ? error.message : '未知错误';
      setTestState({ status: 'error', message: `连接失败：${detail}` });
    }
  }

  async function fetchAvailableModels() {
    const base = normalizeBaseUrl(workingConfig.baseUrl);
    if (!base) {
      setModelFetchState({ status: 'error', message: 'Base URL 不能为空。' });
      return;
    }

    setModelFetchState({ status: 'loading', message: '正在拉取模型列表...' });

    try {
      if (workingConfig.provider === 'ollama') {
        const response = await fetch(`${base}/api/tags`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = (await response.json()) as { models?: Array<{ name?: string; model?: string }> };
        const modelNames = (data.models ?? [])
          .map((item) => item.name ?? item.model ?? '')
          .filter((name) => !!name);

        if (modelNames.length === 0) {
          throw new Error('没有返回可用模型');
        }

        setAvailableModels(modelNames);
        setModelFetchState({ status: 'ok', message: `已拉取 ${modelNames.length} 个模型。` });
        return;
      }

      const headers: Record<string, string> = {};
      if (workingConfig.apiKey.trim()) {
        headers.Authorization = `Bearer ${workingConfig.apiKey.trim()}`;
      }
      const response = await fetch(`${base}/v1/models`, { headers });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as { data?: Array<{ id?: string }> };
      const modelNames = (data.data ?? []).map((item) => item.id ?? '').filter((name) => !!name);

      if (modelNames.length === 0) {
        throw new Error('没有返回可用模型');
      }

      setAvailableModels(modelNames);
      setModelFetchState({ status: 'ok', message: `已拉取 ${modelNames.length} 个模型。` });
    } catch (error) {
      const detail = error instanceof Error ? error.message : '未知错误';
      setAvailableModels([]);
      setModelFetchState({ status: 'error', message: `拉取失败：${detail}` });
    }
  }

  async function sendTestMessage() {
    const base = normalizeBaseUrl(workingConfig.baseUrl);
    if (!base) {
      setMessageTestState({
        status: 'error',
        message: 'Base URL 不能为空。',
        response: '',
      });
      return;
    }
    if (!workingConfig.chatModel.trim()) {
      setMessageTestState({
        status: 'error',
        message: '请先填写 Chat Model。',
        response: '',
      });
      return;
    }

    setMessageTestState({
      status: 'sending',
      message: '正在发送测试消息...',
      response: '',
    });

    try {
      if (workingConfig.provider === 'ollama') {
        const response = await fetch(`${base}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: workingConfig.chatModel,
            messages: [{ role: 'user', content: testPrompt }],
            stream: false,
          }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = (await response.json()) as {
          message?: { content?: string };
        };
        const text = data.message?.content ?? '收到响应，但内容为空。';
        setMessageTestState({
          status: 'ok',
          message: '测试消息发送成功。',
          response: text,
        });
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (workingConfig.apiKey.trim()) {
        headers.Authorization = `Bearer ${workingConfig.apiKey.trim()}`;
      }

      const response = await fetch(`${base}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: workingConfig.chatModel,
          messages: [{ role: 'user', content: testPrompt }],
          temperature: 0.2,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content ?? '收到响应，但内容为空。';
      setMessageTestState({
        status: 'ok',
        message: '测试消息发送成功。',
        response: text,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : '未知错误';
      setMessageTestState({
        status: 'error',
        message: `测试消息失败：${detail}`,
        response: '',
      });
    }
  }

  return (
    <div>
      <div className="box">
        <h2 className="bg-brown-700 p-2 font-display text-2xl tracking-wider shadow-solid text-center">
          API 接口面板
        </h2>
      </div>

      <div className="desc mt-4">
        <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-3">
          <p className="font-display text-lg">连接配置档案</p>

          <label className="block">
            <span>当前档案</span>
            <select
              className="mt-1 w-full rounded bg-brown-900 px-2 py-1 text-brown-100"
              value={activeProfileName}
              onChange={(event) => switchProfile(event.target.value)}
            >
              {profiles.map((profile) => (
                <option key={profile.name} value={profile.name}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded bg-brown-900 px-2 py-1 text-brown-100"
              placeholder="新档案名称"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
            />
            <button className="rounded bg-clay-700 px-3 py-1" onClick={createProfile}>
              创建
            </button>
          </div>

          <label className="block">
            <span>Provider</span>
            <select
              className="mt-1 w-full rounded bg-brown-900 px-2 py-1 text-brown-100"
              value={workingConfig.provider}
              onChange={(event) =>
                updateWorkingConfig((prev) => ({
                  ...prev,
                  provider: event.target.value as ProviderType,
                }))
              }
            >
              <option value="ollama">ollama</option>
              <option value="openai">openai</option>
              <option value="together">together</option>
              <option value="custom">custom</option>
            </select>
          </label>

          <label className="block">
            <span>Base URL</span>
            <input
              className="mt-1 w-full rounded bg-brown-900 px-2 py-1 text-brown-100"
              value={workingConfig.baseUrl}
              onChange={(event) =>
                updateWorkingConfig((prev) => ({ ...prev, baseUrl: event.target.value }))
              }
            />
          </label>

          <label className="block">
            <span>Chat Model</span>
            <input
              className="mt-1 w-full rounded bg-brown-900 px-2 py-1 text-brown-100"
              value={workingConfig.chatModel}
              onChange={(event) =>
                updateWorkingConfig((prev) => ({ ...prev, chatModel: event.target.value }))
              }
            />
            {availableModels.length > 0 && (
              <select
                className="mt-2 w-full rounded bg-brown-900 px-2 py-1 text-brown-100"
                value={workingConfig.chatModel}
                onChange={(event) =>
                  updateWorkingConfig((prev) => ({ ...prev, chatModel: event.target.value }))
                }
              >
                {availableModels.map((model) => (
                  <option key={`chat-${model}`} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            )}
          </label>

          <label className="block">
            <span>Embedding Model</span>
            <input
              className="mt-1 w-full rounded bg-brown-900 px-2 py-1 text-brown-100"
              value={workingConfig.embeddingModel}
              onChange={(event) =>
                updateWorkingConfig((prev) => ({ ...prev, embeddingModel: event.target.value }))
              }
            />
            {availableModels.length > 0 && (
              <select
                className="mt-2 w-full rounded bg-brown-900 px-2 py-1 text-brown-100"
                value={workingConfig.embeddingModel}
                onChange={(event) =>
                  updateWorkingConfig((prev) => ({ ...prev, embeddingModel: event.target.value }))
                }
              >
                {availableModels.map((model) => (
                  <option key={`embedding-${model}`} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            )}
          </label>

          <label className="block">
            <span>API Key</span>
            <input
              type="password"
              className="mt-1 w-full rounded bg-brown-900 px-2 py-1 text-brown-100"
              value={workingConfig.apiKey}
              onChange={(event) =>
                updateWorkingConfig((prev) => ({ ...prev, apiKey: event.target.value }))
              }
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button className="rounded bg-clay-700 px-3 py-1" onClick={updateCurrentProfile}>
              更新
            </button>
            <button className="rounded bg-clay-700 px-3 py-1" onClick={reloadCurrentProfile}>
              重载
            </button>
            <button className="rounded bg-rose-800 px-3 py-1" onClick={deleteCurrentProfile}>
              删除
            </button>
            <button className="rounded bg-amber-700 px-3 py-1" onClick={() => setShowInfo((v) => !v)}>
              信息
            </button>
            <button className="rounded bg-brown-500 px-3 py-1" onClick={fetchAvailableModels}>
              拉取可用模型
            </button>
            <button className="rounded bg-green-700 px-3 py-1" onClick={testConnection}>
              测试连接
            </button>
            <button className="rounded bg-sky-700 px-3 py-1" onClick={sendTestMessage}>
              发送测试消息
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className={`inline-block rounded px-2 py-0.5 text-xs ${statusClass(testState.status)}`}>
              {testState.status.toUpperCase()}
            </span>
            <span className="text-brown-200">{unsaved ? '有未保存修改' : '配置已保存'}</span>
          </div>
          <p>{testState.message}</p>

          <div className="flex items-center justify-between gap-3">
            <span className={`inline-block rounded px-2 py-0.5 text-xs ${statusClass(modelFetchState.status)}`}>
              {modelFetchState.status.toUpperCase()}
            </span>
            <span className="text-brown-200">模型数：{availableModels.length}</span>
          </div>
          <p>{modelFetchState.message}</p>

          <label className="block">
            <span>测试消息内容</span>
            <input
              className="mt-1 w-full rounded bg-brown-900 px-2 py-1 text-brown-100"
              value={testPrompt}
              onChange={(event) => setTestPrompt(event.target.value)}
            />
          </label>

          <div className="flex items-center justify-between gap-3">
            <span className={`inline-block rounded px-2 py-0.5 text-xs ${statusClass(messageTestState.status)}`}>
              {messageTestState.status.toUpperCase()}
            </span>
            <span className="text-brown-200">消息可用性检测</span>
          </div>
          <p>{messageTestState.message}</p>
          {messageTestState.response && (
            <div className="rounded border border-brown-500 p-2 text-brown-100 whitespace-pre-wrap break-words">
              {messageTestState.response}
            </div>
          )}

          {showInfo && activeProfile && (
            <div className="rounded border border-brown-500 p-2">
              <p>档案名：{activeProfile.name}</p>
              <p>最后更新时间：{nowText(activeProfile.updatedAt)}</p>
              <p>当前设计：档案保存到浏览器本地，便于快速切换连接配置。</p>
            </div>
          )}
        </div>
      </div>

      <div className="box mt-6">
        <h2 className="bg-brown-700 p-2 font-display text-2xl tracking-wider shadow-solid text-center">
          角色定位面板
        </h2>
      </div>

      <div className="desc mt-4">
        <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-3">
          {roleLocatorEntries.length === 0 && <p>当前没有可定位角色。</p>}
          {roleLocatorEntries.map((role) => (
            <details key={role.playerId} className="rounded border border-brown-500 p-2">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
                <span>{role.name} ({role.playerId})</span>
                <button
                  type="button"
                  className="rounded bg-clay-700 px-2 py-1 text-xs"
                  onClick={(event) => {
                    event.preventDefault();
                    onFocusPlayer(role.playerId);
                  }}
                >
                  定位到该角色
                </button>
              </summary>
              <div className="mt-2 space-y-1 text-brown-100">
                <p>character：{role.character}</p>
                <p>position：({role.position.x}, {role.position.y})</p>
                <p>facing：{role.facing}</p>
                <p>activity：{role.activity}</p>
                <p>social：{role.social}</p>
                <p>description：{role.description}</p>
                {role.publicProfile && <p>publicProfile：{role.publicProfile}</p>}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
