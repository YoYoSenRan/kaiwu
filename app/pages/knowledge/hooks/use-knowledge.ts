/**
 * 知识库列表的共享 hook。
 */
export function useKnowledgeList() {
  const [list, setList] = useState<Awaited<ReturnType<typeof window.electron.knowledge.base.list>>>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.electron.knowledge.base.list()
      setList(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { list, loading, refresh }
}
