import { Id } from '../../convex/_generated/dataModel';
import { GMMockGuardView, GMMockInterventionView, gmDebugMockData } from './gmDebugMock';

const UI_TEXT = {
  title: '\u0047\u004d \u8c03\u8bd5\u9762\u677f',
  latestIntervention: '\u6700\u8fd1\u4e00\u6b21 GM \u4ecb\u5165',
  conversationId: '\u4f1a\u8bdd ID',
  rawOutput: '\u539f\u59cb\u8f93\u51fa',
  regeneratedOutput: '\u91cd\u751f\u6210\u8f93\u51fa',
  visibleFacts: '\u5f53\u524d\u53ef\u89c1\u4e8b\u5b9e\u6458\u8981',
  hiddenFacts: '\u547d\u4e2d\u7684\u9690\u85cf\u4e8b\u5b9e',
  recentWillingness: '\u6700\u8fd1 willingness \u6392\u5e8f',
  triggerReason: '\u89e6\u53d1\u539f\u56e0',
  nextSpeaker: '\u4e0b\u4e00\u4f4d\u8bf4\u8bdd\u8005',
  visibleInfo: '\u7684\u5f53\u524d\u53ef\u89c1\u4fe1\u606f',
  nearbyAgents: '\u9644\u8fd1\u89d2\u8272',
  visibleObjects: '\u53ef\u89c1\u7269\u4f53',
  factPath: 'fact \u4f20\u64ad\u8def\u5f84',
  path: '\u4f20\u64ad\u94fe\u8def',
  levelGuide: 'intervention level \u8bf4\u660e',
  developerOnly:
    '\u8fd9\u6761\u63d0\u793a\u53ea\u9762\u5411\u8c03\u8bd5\u8005\u5c55\u793a\uff0c\u4e0d\u5c5e\u4e8e\u6e38\u620f\u4e16\u754c\u5185\u4fe1\u606f\uff0c\u4e5f\u4e0d\u4f1a\u5199\u5165\u89d2\u8272\u5bf9\u8bdd\u6216\u8bb0\u5fc6\u3002',
  noData: '\u65e0',
  agent: 'Agent',
  decision: '\u5224\u5b9a',
};

function interventionBadgeClass(level: GMMockInterventionView['interventionLevel']) {
  switch (level) {
    case 0:
      return 'bg-green-700 text-green-50';
    case 1:
      return 'bg-amber-700 text-amber-50';
    case 2:
      return 'bg-orange-700 text-orange-50';
    case 3:
      return 'bg-rose-700 text-rose-50';
    default:
      return 'bg-brown-600 text-brown-50';
  }
}

function decisionLabel(level: GMMockInterventionView['interventionLevel']) {
  switch (level) {
    case 0:
      return 'Level 0: \u4ec5\u8bb0\u5f55';
    case 1:
      return 'Level 1: \u5df2\u9759\u9ed8\u91cd\u751f\u6210';
    case 2:
      return 'Level 2: demo \u6539\u5199';
    case 3:
      return 'Level 3: \u5df2\u62e6\u622a/\u8df3\u8fc7\u5199\u5165';
    default:
      return '\u672a\u77e5\u7b49\u7ea7';
  }
}

function InterventionBadge({ level }: { level: GMMockInterventionView['interventionLevel'] }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-[10px] uppercase tracking-wide ${interventionBadgeClass(
        level,
      )}`}
    >
      {decisionLabel(level)}
    </span>
  );
}

function GuardEventCard({ event }: { event: GMMockGuardView }) {
  return (
    <details className="desc" open={event.interventionLevel > 0}>
      <summary className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-2 cursor-pointer list-none">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-display text-lg">{event.agentId}</p>
            <p className="text-brown-200">
              {event.decision} / {event.reasoningType}
            </p>
          </div>
          <InterventionBadge level={event.interventionLevel} />
        </div>
      </summary>
      <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm px-4 pb-4 pt-2 space-y-3 border-t border-brown-500">
        <p>
          {UI_TEXT.conversationId}\uff1a{event.conversationId}
        </p>
        <p>
          {UI_TEXT.rawOutput}\uff1a{event.rawOutput}
        </p>
        {event.regeneratedOutput && (
          <p>
            {UI_TEXT.regeneratedOutput}\uff1a{event.regeneratedOutput}
          </p>
        )}
        <p>
          {UI_TEXT.visibleFacts}\uff1a{event.visibleFactsSummary.join('\u3001') || UI_TEXT.noData}
        </p>
        <p>
          {UI_TEXT.hiddenFacts}\uff1a{event.matchedHiddenFacts.join('\u3001') || UI_TEXT.noData}
        </p>
      </div>
    </details>
  );
}

export function GMDebugPanel({ worldId: _worldId }: { worldId: Id<'worlds'> }) {
  // Reserved for future real-query integration.
  const data = gmDebugMockData;

  return (
    <div className="mt-6">
      <div className="box">
        <h2 className="bg-brown-700 p-2 font-display text-2xl tracking-wider shadow-solid text-center">
          {UI_TEXT.title}
        </h2>
      </div>

      <div className="desc mt-4">
        <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="font-display text-lg">{UI_TEXT.latestIntervention}</p>
            <InterventionBadge level={data.latestIntervention.interventionLevel} />
          </div>
          <p>
            {UI_TEXT.agent}\uff1a{data.latestIntervention.agentId}
          </p>
          <p>
            {UI_TEXT.decision}\uff1a{data.latestIntervention.decision}
          </p>
          <p>{data.latestIntervention.summary}</p>
          <p>
            {UI_TEXT.rawOutput}\uff1a{data.latestIntervention.rawOutput}
          </p>
          {data.latestIntervention.regeneratedOutput && (
            <p>
              {UI_TEXT.regeneratedOutput}\uff1a{data.latestIntervention.regeneratedOutput}
            </p>
          )}
          <p className="text-brown-200">{UI_TEXT.developerOnly}</p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {data.guardEvents.map((event) => (
          <GuardEventCard
            key={`${event.agentId}-${event.conversationId}-${event.decision}`}
            event={event}
          />
        ))}
      </div>

      <div className="desc mt-4">
        <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-3">
          <p className="font-display text-lg">{UI_TEXT.recentWillingness}</p>
          <p>
            {UI_TEXT.conversationId}\uff1a{data.willingness.conversationId}
          </p>
          <p>
            {UI_TEXT.triggerReason}\uff1a{data.willingness.triggerReason}
          </p>
          <p>
            {UI_TEXT.nextSpeaker}\uff1a{data.willingness.selectedNextSpeaker}
          </p>
          <ul className="list-disc pl-5 space-y-1">
            {data.willingness.ranking.map((item) => (
              <li key={item.agentId}>
                {item.agentId}\uff1a{item.score} / {item.reason}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {data.visibleInfo.map((view, index) => (
          <details key={view.agentId} className="desc" open={index === 0}>
            <summary className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-2 cursor-pointer list-none">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-display text-lg">
                    {view.agentId}
                    {UI_TEXT.visibleInfo}
                  </p>
                  <p className="text-brown-200">
                    {view.room} / {view.zone}
                  </p>
                </div>
              </div>
            </summary>
            <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm px-4 pb-4 pt-2 space-y-2 border-t border-brown-500">
              <p>
                {UI_TEXT.nearbyAgents}\uff1a{view.nearbyAgents.join('\u3001') || UI_TEXT.noData}
              </p>
              <p>
                {UI_TEXT.visibleObjects}\uff1a{view.visibleObjects.join('\u3001') || UI_TEXT.noData}
              </p>
              <p>
                {UI_TEXT.visibleFacts}\uff1a{view.visibleFacts.join('\u3001') || UI_TEXT.noData}
              </p>
            </div>
          </details>
        ))}
      </div>

      <div className="desc mt-4">
        <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-3">
          <p className="font-display text-lg">{UI_TEXT.factPath}</p>
          <p>
            {data.factPath.factId} / {data.factPath.title}
          </p>
          <p>
            {UI_TEXT.path}\uff1a{data.factPath.path.join(' -> ')}
          </p>
          <p>{data.factPath.explanation}</p>
        </div>
      </div>

      <div className="desc mt-4">
        <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-2">
          <p className="font-display text-lg">{UI_TEXT.levelGuide}</p>
          <p>Level 0: record only, no interception.</p>
          <p>Level 1: one silent regeneration before write.</p>
          <p>Level 2: demo-only rewrite to a softer expression.</p>
          <p>Level 3: block write and keep the text out of memory summaries.</p>
        </div>
      </div>
    </div>
  );
}
