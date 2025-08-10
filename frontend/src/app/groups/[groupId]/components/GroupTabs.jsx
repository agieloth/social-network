export default function GroupTabs({ activeTab, setActiveTab, isCreator }) {
  return (
    <div className="flex border-b border-gray-700 mb-6">
      <TabButton 
        name="posts"
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        label="Posts"
      />
      <TabButton 
        name="events"
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        label="Events"
      />
      {isCreator && (
        <>
          <TabButton 
            name="requests"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            label="Pending Requests"
          />
          <TabButton 
            name="members"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            label="Members"
          />
        </>
      )}
    </div>
  )
}

function TabButton({ name, activeTab, setActiveTab, label }) {
  return (
    <button
      onClick={() => setActiveTab(name)}
      className={`px-4 py-2 ${activeTab === name ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
    >
      {label}
    </button>
  )
}