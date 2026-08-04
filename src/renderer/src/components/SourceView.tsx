interface Props {
  source: string
}

export default function SourceView({ source }: Props) {
  return (
    <pre className="source-view">
      <code>{source}</code>
    </pre>
  )
}
